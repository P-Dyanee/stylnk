import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "..", ".env") });
import cors from "cors";
import express from "express";
import http from "http";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { Server } from "socket.io";
import { z } from "zod";
import {
  type AuthRequest,
  authMiddleware,
  getBearerToken,
  signToken,
  verifyToken,
} from "./auth";
import { pool, query, withTransaction } from "./db";
import type { PoolClient } from "pg";

type SafeUser = {
  id: number;
  name: string;
  email: string;
  avatarUrl: string | null;
  createdAt: string;
};

type ConversationParticipant = {
  id: number;
  name: string;
  email: string;
  avatarUrl: string | null;
  isOnline: boolean;
};

type ConversationSummary = {
  id: number;
  title: string;
  isGroup: boolean;
  unreadCount: number;
  lastMessage: string;
  lastMessageAt: string | null;
  lastMessageStatus: "sent" | "delivered" | "seen" | null;
  participants: ConversationParticipant[];
};

type HydratedMessage = {
  id: number;
  conversationId: number;
  senderId: number;
  senderName: string;
  content: string;
  createdAt: string;
  status: "sent" | "delivered" | "seen";
  clientId?: string | null;
};

type ActiveCall = {
  id: string;
  conversationId: number;
  initiatedBy: number;
  mode: "audio" | "video";
  participantIds: number[];
  acceptedBy: Set<number>;
  createdAt: string;
};

const port = Number(process.env.PORT || 4000);
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

const onlineSockets = new Map<number, Set<string>>();
const activeCalls = new Map<string, ActiveCall>();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(128),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
});

const directConversationSchema = z.object({
  recipientId: z.number().int().positive(),
});

const groupConversationSchema = z.object({
  title: z.string().min(2).max(120),
  participantIds: z.array(z.number().int().positive()).min(2),
});

const sendMessageSchema = z.object({
  conversationId: z.number().int().positive().optional(),
  content: z.string().min(1).max(2000),
  clientId: z.string().min(1).max(100).optional(),
});

const avatarSchema = z.object({
  avatarUrl: z.string().min(1).max(5_000_000),
});

const callStartSchema = z.object({
  // Socket / JSON may deliver ids as strings; coerce so validation matches the client.
  conversationId: z.coerce.number().int().positive(),
  mode: z.enum(["audio", "video"]),
});

const callActionSchema = z.object({
  callId: z.string().min(1),
});

const relaySchema = z.object({
  callId: z.string().min(1),
  targetUserId: z.number().int().positive(),
  payload: z.any(),
});

function isUserOnline(userId: number) {
  return (onlineSockets.get(userId)?.size ?? 0) > 0;
}

function addOnlineSocket(userId: number, socketId: string) {
  const sockets = onlineSockets.get(userId) ?? new Set<string>();
  sockets.add(socketId);
  onlineSockets.set(userId, sockets);
}

function removeOnlineSocket(userId: number, socketId: string) {
  const sockets = onlineSockets.get(userId);
  if (!sockets) {
    return;
  }

  sockets.delete(socketId);
  if (sockets.size === 0) {
    onlineSockets.delete(userId);
  }
}

function emitPresenceSnapshot(socketId: string) {
  io.to(socketId).emit("presence:snapshot", {
    userIds: Array.from(onlineSockets.keys()),
  });
}

function emitPresenceUpdate(userId: number, isOnline: boolean) {
  io.emit("presence:update", { userId, isOnline });
}

function emitConversationRefresh(userIds: number[]) {
  const uniqueUserIds = Array.from(new Set(userIds));
  for (const userId of uniqueUserIds) {
    io.to(`user:${userId}`).emit("conversation:refresh");
  }
}

async function getConversationParticipantIds(
  conversationId: number,
  client?: PoolClient,
) {
  const result = await query<{ user_id: number }>(
    `
      SELECT user_id
      FROM conversation_participants
      WHERE conversation_id = $1
      ORDER BY user_id ASC
    `,
    [conversationId],
    client,
  );

  return result.rows.map((row) => row.user_id);
}

async function ensureConversationMember(
  conversationId: number,
  userId: number,
  client?: PoolClient,
) {
  const result = await query(
    `
      SELECT 1
      FROM conversation_participants
      WHERE conversation_id = $1 AND user_id = $2
      LIMIT 1
    `,
    [conversationId, userId],
    client,
  );

  return (result.rowCount ?? 0) > 0;
}

async function listConversationParticipants(
  conversationIds: number[],
  currentUserId: number,
) {
  if (conversationIds.length === 0) {
    return new Map<number, ConversationParticipant[]>();
  }

  const result = await query<{
    conversation_id: number;
    id: number;
    name: string;
    email: string;
    avatar_url: string | null;
  }>(
    `
      SELECT
        cp.conversation_id,
        u.id,
        u.name,
        u.email,
        u.avatar_url
      FROM conversation_participants cp
      JOIN users u ON u.id = cp.user_id
      WHERE cp.conversation_id = ANY($1::bigint[])
      ORDER BY cp.conversation_id ASC, u.name ASC
    `,
    [conversationIds],
  );

  const grouped = new Map<number, ConversationParticipant[]>();

  for (const row of result.rows) {
    const next = grouped.get(row.conversation_id) ?? [];
    next.push({
      id: row.id,
      name: row.name,
      email: row.email,
      avatarUrl: row.avatar_url,
      isOnline: row.id === currentUserId ? true : isUserOnline(row.id),
    });
    grouped.set(row.conversation_id, next);
  }

  return grouped;
}

async function computeSenderStatus(
  messageId: number,
  senderId: number,
  client?: PoolClient,
) {
  const result = await query<{ status: "sent" | "delivered" | "seen" }>(
    `
      SELECT
        CASE
          WHEN COUNT(*) FILTER (WHERE user_id <> $2) = 0 THEN 'sent'
          WHEN COUNT(*) FILTER (WHERE user_id <> $2 AND status = 'seen') =
               COUNT(*) FILTER (WHERE user_id <> $2) THEN 'seen'
          WHEN COUNT(*) FILTER (WHERE user_id <> $2 AND status IN ('delivered', 'seen')) =
               COUNT(*) FILTER (WHERE user_id <> $2) THEN 'delivered'
          ELSE 'sent'
        END AS status
      FROM message_status
      WHERE message_id = $1
    `,
    [messageId, senderId],
    client,
  );

  return result.rows[0]?.status ?? "sent";
}

async function getHydratedMessage(
  messageId: number,
  viewerId: number,
  client?: PoolClient,
) {
  const result = await query<{
    id: number;
    conversation_id: number;
    sender_id: number;
    sender_name: string;
    content: string;
    created_at: Date;
    client_id: string | null;
    recipient_status: "sent" | "delivered" | "seen" | null;
  }>(
    `
      SELECT
        m.id,
        m.conversation_id,
        m.sender_id,
        u.name AS sender_name,
        m.content,
        m.created_at,
        m.client_id,
        ms.status AS recipient_status
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      LEFT JOIN message_status ms
        ON ms.message_id = m.id
       AND ms.user_id = $2
      WHERE m.id = $1
      LIMIT 1
    `,
    [messageId, viewerId],
    client,
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error("Message not found");
  }

  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    senderName: row.sender_name,
    content: row.content,
    createdAt: row.created_at.toISOString(),
    clientId: row.client_id,
    status:
      row.sender_id === viewerId
        ? await computeSenderStatus(row.id, viewerId, client)
        : row.recipient_status ?? "delivered",
  } satisfies HydratedMessage;
}

async function hydrateMessages(conversationId: number, viewerId: number) {
  const result = await query<{
    id: number;
    conversation_id: number;
    sender_id: number;
    sender_name: string;
    content: string;
    created_at: Date;
    client_id: string | null;
    recipient_status: "sent" | "delivered" | "seen" | null;
  }>(
    `
      SELECT
        m.id,
        m.conversation_id,
        m.sender_id,
        u.name AS sender_name,
        m.content,
        m.created_at,
        m.client_id,
        ms.status AS recipient_status
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      LEFT JOIN message_status ms
        ON ms.message_id = m.id
       AND ms.user_id = $2
      WHERE m.conversation_id = $1
      ORDER BY m.created_at ASC, m.id ASC
    `,
    [conversationId, viewerId],
  );

  const messages: HydratedMessage[] = [];
  for (const row of result.rows) {
    messages.push({
      id: row.id,
      conversationId: row.conversation_id,
      senderId: row.sender_id,
      senderName: row.sender_name,
      content: row.content,
      createdAt: row.created_at.toISOString(),
      clientId: row.client_id,
      status:
        row.sender_id === viewerId
          ? await computeSenderStatus(row.id, viewerId)
          : row.recipient_status ?? "delivered",
    });
  }

  return messages;
}

async function listConversationsForUser(userId: number, onlyGroups = false) {
  const result = await query<{
    id: number;
    title: string | null;
    is_group: boolean;
    unread_count: number;
    last_message: string | null;
    last_message_at: Date | null;
    last_message_sender_id: number | null;
    last_message_id: number | null;
  }>(
    `
      SELECT
        c.id,
        c.title,
        c.is_group,
        COALESCE(unread.unread_count, 0) AS unread_count,
        latest.id AS last_message_id,
        latest.content AS last_message,
        latest.created_at AS last_message_at,
        latest.sender_id AS last_message_sender_id
      FROM conversations c
      JOIN conversation_participants me
        ON me.conversation_id = c.id
       AND me.user_id = $1
      LEFT JOIN LATERAL (
        SELECT
          m.id,
          m.content,
          m.created_at,
          m.sender_id
        FROM messages m
        WHERE m.conversation_id = c.id
        ORDER BY m.created_at DESC, m.id DESC
        LIMIT 1
      ) latest ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS unread_count
        FROM messages m
        LEFT JOIN message_status ms
          ON ms.message_id = m.id
         AND ms.user_id = $1
        WHERE m.conversation_id = c.id
          AND m.sender_id <> $1
          AND COALESCE(ms.status, 'sent') <> 'seen'
      ) unread ON true
      WHERE ($2::boolean = false OR c.is_group = true)
      ORDER BY COALESCE(latest.created_at, c.created_at) DESC, c.id DESC
    `,
    [userId, onlyGroups],
  );

  const conversationIds = result.rows.map((row) => row.id);
  const participantsByConversation = await listConversationParticipants(
    conversationIds,
    userId,
  );

  const summaries: ConversationSummary[] = [];
  for (const row of result.rows) {
    const participants = participantsByConversation.get(row.id) ?? [];
    const otherParticipants = participants.filter((participant) => participant.id !== userId);
    const computedTitle = row.is_group
      ? row.title || "Group chat"
      : otherParticipants.map((participant) => participant.name).join(", ") || "Direct chat";

    let lastMessageStatus: "sent" | "delivered" | "seen" | null = null;
    if (row.last_message_id && row.last_message_sender_id === userId) {
      lastMessageStatus = await computeSenderStatus(row.last_message_id, userId);
    }

    summaries.push({
      id: row.id,
      title: computedTitle,
      isGroup: row.is_group,
      unreadCount: row.unread_count,
      lastMessage: row.last_message ?? "No messages yet",
      lastMessageAt: row.last_message_at?.toISOString() ?? null,
      lastMessageStatus,
      participants,
    });
  }

  return summaries;
}

async function markMessagesDeliveredForUser(userId: number) {
  const result = await query<{
    message_id: number;
    conversation_id: number;
    sender_id: number;
  }>(
    `
      UPDATE message_status ms
      SET status = 'delivered',
          updated_at = NOW()
      FROM messages m
      WHERE ms.message_id = m.id
        AND ms.user_id = $1
        AND ms.status = 'sent'
        AND m.sender_id <> $1
      RETURNING ms.message_id, m.conversation_id, m.sender_id
    `,
    [userId],
  );

  for (const row of result.rows) {
    const status = await computeSenderStatus(row.message_id, row.sender_id);
    io.to(`conversation:${row.conversation_id}`).emit("message:status", {
      conversationId: row.conversation_id,
      messageId: row.message_id,
      status,
    });
  }
}

async function markConversationSeen(conversationId: number, userId: number) {
  const result = await query<{
    message_id: number;
    sender_id: number;
  }>(
    `
      UPDATE message_status ms
      SET status = 'seen',
          updated_at = NOW()
      FROM messages m
      WHERE ms.message_id = m.id
        AND ms.user_id = $2
        AND m.conversation_id = $1
        AND m.sender_id <> $2
        AND ms.status <> 'seen'
      RETURNING ms.message_id, m.sender_id
    `,
    [conversationId, userId],
  );

  for (const row of result.rows) {
    const status = await computeSenderStatus(row.message_id, row.sender_id);
    io.to(`conversation:${conversationId}`).emit("message:status", {
      conversationId,
      messageId: row.message_id,
      status,
    });
  }
}

async function createMessage(
  conversationId: number,
  senderId: number,
  content: string,
  clientId?: string,
) {
  return withTransaction(async (client) => {
    const isMember = await ensureConversationMember(conversationId, senderId, client);
    if (!isMember) {
      throw new Error("Not a participant in this conversation");
    }

    const insertMessage = await query<{ id: number }>(
      `
        INSERT INTO messages (conversation_id, sender_id, content, client_id)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `,
      [conversationId, senderId, content.trim(), clientId ?? null],
      client,
    );

    const messageId = insertMessage.rows[0].id;
    const participantIds = await getConversationParticipantIds(conversationId, client);

    for (const participantId of participantIds) {
      const status =
        participantId === senderId
          ? "seen"
          : isUserOnline(participantId)
            ? "delivered"
            : "sent";

      await query(
        `
          INSERT INTO message_status (message_id, user_id, status, updated_at)
          VALUES ($1, $2, $3, NOW())
        `,
        [messageId, participantId, status],
        client,
      );
    }

    const payloads = new Map<number, HydratedMessage>();
    for (const participantId of participantIds) {
      payloads.set(
        participantId,
        await getHydratedMessage(messageId, participantId, client),
      );
    }

    return {
      participantIds,
      payloads,
    };
  });
}

async function findOrCreateDirectConversation(userId: number, recipientId: number) {
  return withTransaction(async (client) => {
    const existing = await query<{ id: number }>(
      `
        SELECT c.id
        FROM conversations c
        JOIN conversation_participants cp
          ON cp.conversation_id = c.id
        WHERE c.is_group = false
          AND cp.user_id IN ($1, $2)
        GROUP BY c.id
        HAVING COUNT(DISTINCT cp.user_id) = 2
           AND (
             SELECT COUNT(*)
             FROM conversation_participants inner_cp
             WHERE inner_cp.conversation_id = c.id
           ) = 2
        LIMIT 1
      `,
      [userId, recipientId],
      client,
    );

    if (existing.rows[0]) {
      return existing.rows[0].id;
    }

    const conversationResult = await query<{ id: number }>(
      `
        INSERT INTO conversations (title, is_group, created_by)
        VALUES (NULL, false, $1)
        RETURNING id
      `,
      [userId],
      client,
    );

    const conversationId = conversationResult.rows[0].id;
    await query(
      `
        INSERT INTO conversation_participants (conversation_id, user_id, joined_at, last_read_at)
        VALUES
          ($1, $2, NOW(), NOW()),
          ($1, $3, NOW(), NOW())
      `,
      [conversationId, userId, recipientId],
      client,
    );

    return conversationId;
  });
}

async function createGroupConversation(
  creatorId: number,
  title: string,
  participantIds: number[],
) {
  return withTransaction(async (client) => {
    const uniqueParticipantIds = Array.from(
      new Set([creatorId, ...participantIds]),
    ).sort((a, b) => a - b);

    const usersResult = await query<{ id: number }>(
      `
        SELECT id
        FROM users
        WHERE id = ANY($1::bigint[])
      `,
      [uniqueParticipantIds],
      client,
    );

    if (usersResult.rowCount !== uniqueParticipantIds.length) {
      throw new Error("One or more participants were not found");
    }

    const conversationResult = await query<{ id: number }>(
      `
        INSERT INTO conversations (title, is_group, created_by)
        VALUES ($1, true, $2)
        RETURNING id
      `,
      [title.trim(), creatorId],
      client,
    );

    const conversationId = conversationResult.rows[0].id;
    for (const participantId of uniqueParticipantIds) {
      await query(
        `
          INSERT INTO conversation_participants (
            conversation_id,
            user_id,
            joined_at,
            last_read_at
          )
          VALUES ($1, $2, NOW(), NOW())
        `,
        [conversationId, participantId],
        client,
      );
    }

    return conversationId;
  });
}

async function getConversationTitleForUser(conversationId: number, userId: number) {
  const summaries = await listConversationsForUser(userId);
  return summaries.find((conversation) => conversation.id === conversationId)?.title ?? "Chat";
}

async function getUserName(userId: number) {
  const result = await query<{ name: string }>(
    `
      SELECT name
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [userId],
  );

  return result.rows[0]?.name ?? "StyLnk User";
}

function toSafeUser(row: {
  id: number;
  name: string;
  email: string;
  avatar_url: string | null;
  created_at: Date;
}) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at.toISOString(),
  } satisfies SafeUser;
}

app.get("/health", async (_req, res) => {
  await query("SELECT 1");
  res.json({ status: "ok" });
});

app.post("/auth/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid registration data" });
  }

  const name = parsed.data.name.trim();
  const email = parsed.data.email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  try {
    const result = await withTransaction(async (client) => {
      const existing = await query(
        `SELECT id FROM users WHERE email = $1 LIMIT 1`,
        [email],
        client,
      );
      if ((existing.rowCount ?? 0) > 0) {
        throw new Error("Email already in use");
      }

      const insertUser = await query<{
        id: number;
        name: string;
        email: string;
        avatar_url: string | null;
        created_at: Date;
      }>(
        `
          INSERT INTO users (name, email, password)
          VALUES ($1, $2, $3)
          RETURNING id, name, email, avatar_url, created_at
        `,
        [name, email, passwordHash],
        client,
      );

      const user = insertUser.rows[0];
      await query(
        `
          INSERT INTO conversations (id, title, is_group, created_by)
          VALUES (1, 'General', true, NULL)
          ON CONFLICT (id) DO UPDATE
          SET title = EXCLUDED.title, is_group = EXCLUDED.is_group
        `,
        [],
        client,
      );

      await query(
        `
          INSERT INTO conversation_participants (
            conversation_id,
            user_id,
            joined_at,
            last_read_at
          )
          VALUES ($1, $2, NOW(), NOW())
          ON CONFLICT (conversation_id, user_id) DO NOTHING
        `,
        [1, user.id],
        client,
      );

      return user;
    });

    const safeUser = toSafeUser(result);
    const token = signToken({ userId: safeUser.id, email: safeUser.email });
    return res.status(201).json({ token, user: safeUser });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not register user";
    const status = message === "Email already in use" ? 409 : 500;
    return res.status(status).json({ message });
  }
});

app.post("/auth/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid login data" });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const password = parsed.data.password;

  const result = await query<{
    id: number;
    name: string;
    email: string;
    password: string;
    avatar_url: string | null;
    created_at: Date;
  }>(
    `
      SELECT id, name, email, password, avatar_url, created_at
      FROM users
      WHERE email = $1
      LIMIT 1
    `,
    [email],
  );

  const user = result.rows[0];
  if (!user) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const matches = await bcrypt.compare(password, user.password);
  if (!matches) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const safeUser = toSafeUser(user);
  const token = signToken({ userId: safeUser.id, email: safeUser.email });
  return res.json({ token, user: safeUser });
});

app.get("/users", authMiddleware, async (req: AuthRequest, res) => {
  const currentUserId = req.user!.userId;
  const result = await query<{
    id: number;
    name: string;
    email: string;
    avatar_url: string | null;
  }>(
    `
      SELECT id, name, email, avatar_url
      FROM users
      WHERE id <> $1
      ORDER BY name ASC
    `,
    [currentUserId],
  );

  res.json(
    result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      avatarUrl: row.avatar_url,
      isOnline: isUserOnline(row.id),
    })),
  );
});

app.get("/conversations", authMiddleware, async (req: AuthRequest, res) => {
  const currentUserId = req.user!.userId;
  const conversations = await listConversationsForUser(currentUserId);
  res.json(conversations);
});

app.get("/groups", authMiddleware, async (req: AuthRequest, res) => {
  const currentUserId = req.user!.userId;
  const groups = await listConversationsForUser(currentUserId, true);
  res.json(groups);
});

app.post("/conversations/direct", authMiddleware, async (req: AuthRequest, res) => {
  const parsed = directConversationSchema.safeParse({
    recipientId: Number(req.body?.recipientId),
  });
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid recipient" });
  }

  const currentUserId = req.user!.userId;
  const recipientId = parsed.data.recipientId;

  if (recipientId === currentUserId) {
    return res.status(400).json({ message: "You can't message yourself" });
  }

  const recipient = await query<{ id: number; name: string }>(
    `SELECT id, name FROM users WHERE id = $1 LIMIT 1`,
    [recipientId],
  );

  if (!recipient.rows[0]) {
    return res.status(404).json({ message: "Recipient not found" });
  }

  const conversationId = await findOrCreateDirectConversation(
    currentUserId,
    recipientId,
  );
  emitConversationRefresh([currentUserId, recipientId]);

  res.status(201).json({
    id: conversationId,
    title: recipient.rows[0].name,
    isGroup: false,
  });
});

app.post("/conversations/group", authMiddleware, async (req: AuthRequest, res) => {
  const parsed = groupConversationSchema.safeParse({
    title: req.body?.title,
    participantIds: Array.isArray(req.body?.participantIds)
      ? req.body.participantIds.map((value: unknown) => Number(value))
      : [],
  });

  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid group payload" });
  }

  try {
    const conversationId = await createGroupConversation(
      req.user!.userId,
      parsed.data.title,
      parsed.data.participantIds,
    );
    const participantIds = Array.from(
      new Set([req.user!.userId, ...parsed.data.participantIds]),
    );
    emitConversationRefresh(participantIds);

    res.status(201).json({
      id: conversationId,
      title: parsed.data.title.trim(),
      isGroup: true,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not create group";
    res.status(400).json({ message });
  }
});

app.get(
  "/conversations/:id/messages",
  authMiddleware,
  async (req: AuthRequest, res) => {
    const conversationId = Number(req.params.id);
    if (!Number.isInteger(conversationId) || conversationId <= 0) {
      return res.status(400).json({ message: "Invalid conversation id" });
    }

    const currentUserId = req.user!.userId;
    const isMember = await ensureConversationMember(conversationId, currentUserId);
    if (!isMember) {
      return res.status(403).json({ message: "Not a participant in this conversation" });
    }

    const messages = await hydrateMessages(conversationId, currentUserId);
    await markConversationSeen(conversationId, currentUserId);
    res.json(messages);
  },
);

app.post(
  "/conversations/:id/messages",
  authMiddleware,
  async (req: AuthRequest, res) => {
    const parsed = sendMessageSchema.safeParse({
      conversationId: Number(req.params.id),
      content: req.body?.content,
      clientId: req.body?.clientId,
    });
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid message payload" });
    }

    try {
      const { payloads, participantIds } = await createMessage(
        parsed.data.conversationId!,
        req.user!.userId,
        parsed.data.content,
        parsed.data.clientId,
      );

      for (const participantId of participantIds) {
        io.to(`user:${participantId}`).emit("message:new", payloads.get(participantId));
      }

      io.to(`conversation:${parsed.data.conversationId}`).emit("conversation:refresh");
      emitConversationRefresh(participantIds);
      res.status(201).json(payloads.get(req.user!.userId));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not send message";
      const status = message.includes("participant") ? 403 : 500;
      res.status(status).json({ message });
    }
  },
);

app.post(
  "/conversations/:id/seen",
  authMiddleware,
  async (req: AuthRequest, res) => {
    const conversationId = Number(req.params.id);
    if (!Number.isInteger(conversationId) || conversationId <= 0) {
      return res.status(400).json({ message: "Invalid conversation id" });
    }

    const currentUserId = req.user!.userId;
    const isMember = await ensureConversationMember(conversationId, currentUserId);
    if (!isMember) {
      return res.status(403).json({ message: "Not a participant in this conversation" });
    }

    await markConversationSeen(conversationId, currentUserId);
    await query(
      `
        UPDATE conversation_participants
        SET last_read_at = NOW()
        WHERE conversation_id = $1 AND user_id = $2
      `,
      [conversationId, currentUserId],
    );

    res.json({ ok: true });
  },
);

app.patch("/me/avatar", authMiddleware, async (req: AuthRequest, res) => {
  const parsed = avatarSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid avatar payload" });
  }

  const result = await query<{
    id: number;
    name: string;
    email: string;
    avatar_url: string | null;
    created_at: Date;
  }>(
    `
      UPDATE users
      SET avatar_url = $2
      WHERE id = $1
      RETURNING id, name, email, avatar_url, created_at
    `,
    [req.user!.userId, parsed.data.avatarUrl],
  );

  if (!result.rows[0]) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json({ user: toSafeUser(result.rows[0]) });
});

io.use((socket, next) => {
  const token =
    typeof socket.handshake.auth.token === "string"
      ? socket.handshake.auth.token
      : getBearerToken(
          typeof socket.handshake.headers.authorization === "string"
            ? socket.handshake.headers.authorization
            : undefined,
        );

  if (!token) {
    next(new Error("Missing auth token"));
    return;
  }

  try {
    const payload = verifyToken(token);
    socket.data.user = payload;
    next();
  } catch {
    next(new Error("Invalid auth token"));
  }
});

io.on("connection", async (socket) => {
  const user = socket.data.user as { userId: number; email: string };
  addOnlineSocket(user.userId, socket.id);
  socket.join(`user:${user.userId}`);

  const memberships = await query<{ conversation_id: number }>(
    `
      SELECT conversation_id
      FROM conversation_participants
      WHERE user_id = $1
    `,
    [user.userId],
  );

  for (const row of memberships.rows) {
    socket.join(`conversation:${row.conversation_id}`);
  }

  emitPresenceSnapshot(socket.id);
  emitPresenceUpdate(user.userId, true);
  await markMessagesDeliveredForUser(user.userId);
  emitConversationRefresh([user.userId]);

  socket.on("conversation:open", async (payload: unknown) => {
    const parsed = z
      .object({ conversationId: z.number().int().positive() })
      .safeParse(payload);
    if (!parsed.success) {
      return;
    }

    const isMember = await ensureConversationMember(
      parsed.data.conversationId,
      user.userId,
    );
    if (!isMember) {
      return;
    }

    socket.join(`conversation:${parsed.data.conversationId}`);
    await markConversationSeen(parsed.data.conversationId, user.userId);
    await query(
      `
        UPDATE conversation_participants
        SET last_read_at = NOW()
        WHERE conversation_id = $1 AND user_id = $2
      `,
      [parsed.data.conversationId, user.userId],
    );
    emitConversationRefresh([user.userId]);
  });

  socket.on(
    "message:send",
    async (payload: unknown, acknowledge?: (value: unknown) => void) => {
      const parsed = sendMessageSchema.safeParse(payload);
      if (!parsed.success || !parsed.data.conversationId) {
        acknowledge?.({ ok: false, message: "Invalid message payload" });
        return;
      }

      try {
        const { payloads, participantIds } = await createMessage(
          parsed.data.conversationId,
          user.userId,
          parsed.data.content,
          parsed.data.clientId,
        );

        for (const participantId of participantIds) {
          io.to(`user:${participantId}`).emit("message:new", payloads.get(participantId));
        }

        io.to(`conversation:${parsed.data.conversationId}`).emit("conversation:refresh");
        emitConversationRefresh(participantIds);
        acknowledge?.({ ok: true, message: payloads.get(user.userId) });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Could not send message";
        acknowledge?.({ ok: false, message });
      }
    },
  );

  socket.on("message:seen", async (payload: unknown) => {
    const parsed = z
      .object({ conversationId: z.number().int().positive() })
      .safeParse(payload);
    if (!parsed.success) {
      return;
    }

    const isMember = await ensureConversationMember(
      parsed.data.conversationId,
      user.userId,
    );
    if (!isMember) {
      return;
    }

    await markConversationSeen(parsed.data.conversationId, user.userId);
    emitConversationRefresh([user.userId]);
  });

  socket.on(
    "call:start",
    async (payload: unknown, acknowledge?: (value: unknown) => void) => {
      const parsed = callStartSchema.safeParse(payload);
      if (!parsed.success) {
        acknowledge?.({ ok: false, message: "Invalid call payload" });
        return;
      }

      const isMember = await ensureConversationMember(
        parsed.data.conversationId,
        user.userId,
      );
      if (!isMember) {
        acknowledge?.({ ok: false, message: "Not a participant in this conversation" });
        return;
      }

      const participantIds = await getConversationParticipantIds(parsed.data.conversationId);
      const callId = randomUUID();
      const call: ActiveCall = {
        id: callId,
        conversationId: parsed.data.conversationId,
        initiatedBy: user.userId,
        mode: parsed.data.mode,
        participantIds,
        acceptedBy: new Set<number>([user.userId]),
        createdAt: new Date().toISOString(),
      };
      activeCalls.set(callId, call);

      const callerName = await getUserName(user.userId);

      for (const participantId of participantIds) {
        if (participantId === user.userId) {
          continue;
        }

        io.to(`user:${participantId}`).emit("call:incoming", {
          callId,
          conversationId: parsed.data.conversationId,
          mode: parsed.data.mode,
          initiatedBy: {
            id: user.userId,
            name: callerName,
          },
          createdAt: call.createdAt,
        });
      }

      acknowledge?.({
        ok: true,
        call: {
          callId,
          conversationId: parsed.data.conversationId,
          participantIds: participantIds.filter((participantId) => participantId !== user.userId),
          mode: parsed.data.mode,
          createdAt: call.createdAt,
        },
      });
    },
  );

  socket.on("call:accept", (payload: unknown) => {
    const parsed = callActionSchema.safeParse(payload);
    if (!parsed.success) {
      return;
    }

    const call = activeCalls.get(parsed.data.callId);
    if (!call || !call.participantIds.includes(user.userId)) {
      return;
    }

    call.acceptedBy.add(user.userId);
    io.to(`conversation:${call.conversationId}`).emit("call:accepted", {
      callId: call.id,
      conversationId: call.conversationId,
      userId: user.userId,
    });
  });

  socket.on("call:decline", (payload: unknown) => {
    const parsed = callActionSchema.safeParse(payload);
    if (!parsed.success) {
      return;
    }

    const call = activeCalls.get(parsed.data.callId);
    if (!call) {
      return;
    }

    io.to(`conversation:${call.conversationId}`).emit("call:declined", {
      callId: call.id,
      conversationId: call.conversationId,
      userId: user.userId,
    });
    activeCalls.delete(call.id);
  });

  socket.on("call:end", (payload: unknown) => {
    const parsed = callActionSchema.safeParse(payload);
    if (!parsed.success) {
      return;
    }

    const call = activeCalls.get(parsed.data.callId);
    if (!call) {
      return;
    }

    io.to(`conversation:${call.conversationId}`).emit("call:ended", {
      callId: call.id,
      conversationId: call.conversationId,
      userId: user.userId,
    });
    activeCalls.delete(call.id);
  });

  socket.on("webrtc:offer", (payload: unknown) => {
    const parsed = relaySchema.safeParse(payload);
    if (!parsed.success) {
      return;
    }
    io.to(`user:${parsed.data.targetUserId}`).emit("webrtc:offer", {
      callId: parsed.data.callId,
      fromUserId: user.userId,
      payload: parsed.data.payload,
    });
  });

  socket.on("webrtc:answer", (payload: unknown) => {
    const parsed = relaySchema.safeParse(payload);
    if (!parsed.success) {
      return;
    }
    io.to(`user:${parsed.data.targetUserId}`).emit("webrtc:answer", {
      callId: parsed.data.callId,
      fromUserId: user.userId,
      payload: parsed.data.payload,
    });
  });

  socket.on("webrtc:ice-candidate", (payload: unknown) => {
    const parsed = relaySchema.safeParse(payload);
    if (!parsed.success) {
      return;
    }
    io.to(`user:${parsed.data.targetUserId}`).emit("webrtc:ice-candidate", {
      callId: parsed.data.callId,
      fromUserId: user.userId,
      payload: parsed.data.payload,
    });
  });

  socket.on("disconnect", () => {
    removeOnlineSocket(user.userId, socket.id);
    if (!isUserOnline(user.userId)) {
      emitPresenceUpdate(user.userId, false);
    }
  });
});

server.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});

process.on("SIGINT", async () => {
  await pool.end();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await pool.end();
  process.exit(0);
});
