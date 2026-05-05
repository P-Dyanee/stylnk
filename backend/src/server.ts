import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import cors from "cors";
import { randomUUID } from "crypto";
import "dotenv/config";
import express from "express";
import http from "http";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { z } from "zod";

const app = express();
const prisma = new PrismaClient();

console.log("Prisma models:", Object.keys(prisma));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// userId → socketId map
const users: Record<string, string> = {};
const socketUsers: Record<string, string> = {};
const activeCalls: Record<
  string,
  {
    callerUserId: string | null;
    callerSocketId: string;
    recipientUserId: string | null;
    recipientSocketId: string;
    callType: "audio" | "video";
    status: "ringing" | "connected" | "ended";
    createdAt: Date;
  }
> = {};

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

const jwtSecret = process.env.JWT_SECRET || "change-this-secret";
const port = Number(process.env.PORT || 4000);

type AuthRequest = express.Request & { userId?: string };

const auth = (
  req: AuthRequest,
  res: express.Response,
  next: express.NextFunction,
) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing auth token" });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, jwtSecret) as { userId: string };
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid auth token" });
  }
};

const toTime = (date: Date) =>
  new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const asParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "ok",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      database: "disconnected",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.post("/auth/register", async (req, res) => {
  const schema = z.object({
    fullName: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request body" });
  }

  const { fullName, email, password } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ message: "Email already in use" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { fullName, email, passwordHash },
  });

  const generalChat = await prisma.chat.upsert({
    where: { id: "general-chat" },
    update: {},
    create: {
      id: "general-chat",
      name: "General",
      isGroup: true,
    },
  });

  await prisma.chatMember.upsert({
    where: {
      chatId_userId: {
        chatId: generalChat.id,
        userId: user.id,
      },
    },
    update: {},
    create: {
      chatId: generalChat.id,
      userId: user.id,
    },
  });

  const token = jwt.sign({ userId: user.id }, jwtSecret, { expiresIn: "7d" });

  res.status(201).json({
    token,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      avatarUrl: user.avatarUrl,
    },
  });
});

app.post("/auth/login", async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request body" });
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ message: "Invalid email or password" });
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const token = jwt.sign({ userId: user.id }, jwtSecret, { expiresIn: "7d" });
  res.json({
    token,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      avatarUrl: user.avatarUrl,
    },
  });
});

app.patch("/me/avatar", auth, async (req: AuthRequest, res) => {
  console.log("Avatar upload request received for user:", req.userId);

  const schema = z.object({
    avatarUrl: z
      .string()
      .min(1)
      .max(10_000_000)
      .refine(
        (value) =>
          value.startsWith("data:image/jpeg;base64,") ||
          value.startsWith("data:image/png;base64,") ||
          value.startsWith("data:image/jpg;base64,") ||
          value.startsWith("data:image/webp;base64,"),
        "Unsupported image format",
      ),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    console.log("Avatar validation failed:", parsed.error);
    return res
      .status(400)
      .json({ message: "Invalid avatar payload", error: parsed.error });
  }

  try {
    console.log("Updating avatar for user:", req.userId);
    const updatedUser = await prisma.user.update({
      where: { id: req.userId! },
      data: { avatarUrl: parsed.data.avatarUrl },
    });

    console.log("Avatar updated successfully for user:", req.userId);
    res.json({
      user: {
        id: updatedUser.id,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        avatarUrl: updatedUser.avatarUrl,
      },
    });
  } catch (error) {
    console.error("Database update error:", error);
    res.status(500).json({
      message: "Failed to update avatar in database",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.get("/me/stats", auth, async (req: AuthRequest, res) => {
  const userId = req.userId!;

  const [chats, groups, calls] = await Promise.all([
    prisma.chatMember.count({
      where: { userId, chat: { isGroup: false } },
    }),
    prisma.chatMember.count({
      where: { userId, chat: { isGroup: true } },
    }),
    prisma.call.count({
      where: {
        OR: [{ callerId: userId }, { recipientId: userId }],
      },
    }),
  ]);

  res.json({ chats, groups, calls });
});

app.get("/users", auth, async (req: AuthRequest, res) => {
  const currentUserId = req.userId!;

  const directoryUsers = await prisma.user.findMany({
    where: {
      id: { not: currentUserId },
    },
    orderBy: { fullName: "asc" },
    select: {
      id: true,
      fullName: true,
      email: true,
      avatarUrl: true,
    },
  });

  res.json(
    directoryUsers.map((user) => ({
      ...user,
      socketId: users[user.id] ?? null,
      isOnline: Boolean(users[user.id]),
    })),
  );
});

app.get("/chats", auth, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const memberships = await prisma.chatMember.findMany({
    where: { userId },
    include: {
      chat: {
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          members: { include: { user: true } },
        },
      },
    },
    orderBy: { chat: { createdAt: "desc" } },
  });

  const result = memberships.map((m) => {
    const last = m.chat.messages[0];
    const oneToOnePeer = m.chat.members.find(
      (cm) => cm.userId !== userId,
    )?.user;
    return {
      id: m.chat.id,
      name: m.chat.isGroup
        ? m.chat.name
        : oneToOnePeer?.fullName || m.chat.name,
      isGroup: m.chat.isGroup,
      peerId: oneToOnePeer?.id ?? null,
      peerSocketId: oneToOnePeer ? users[oneToOnePeer.id] ?? null : null,
      isOnline: oneToOnePeer ? Boolean(users[oneToOnePeer.id]) : false,
      unreadCount: 0,
      lastMessage: last?.text || "No messages yet",
      time: last ? toTime(last.createdAt) : "",
    };
  });

  res.json(result);
});

app.post("/chats/direct", auth, async (req: AuthRequest, res) => {
  const schema = z.object({
    recipientId: z.string().min(1),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request body" });
  }

  const userId = req.userId!;
  const { recipientId } = parsed.data;

  if (recipientId === userId) {
    return res.status(400).json({ message: "You can't message yourself" });
  }

  const recipient = await prisma.user.findUnique({
    where: { id: recipientId },
    select: { id: true, fullName: true },
  });

  if (!recipient) {
    return res.status(404).json({ message: "User not found" });
  }

  const existingChats = await prisma.chat.findMany({
    where: {
      isGroup: false,
      members: {
        some: { userId },
      },
    },
    include: {
      members: true,
    },
  });

  const existingChat = existingChats.find((chat) => {
    const memberIds = chat.members.map((member) => member.userId);
    return (
      memberIds.length === 2 &&
      memberIds.includes(userId) &&
      memberIds.includes(recipientId)
    );
  });

  if (existingChat) {
    return res.json({ id: existingChat.id, name: recipient.fullName });
  }

  const chat = await prisma.chat.create({
    data: {
      name: recipient.fullName,
      isGroup: false,
      members: {
        create: [{ userId }, { userId: recipientId }],
      },
    },
  });

  res.status(201).json({ id: chat.id, name: recipient.fullName });
});

app.get("/groups", auth, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const memberships = await prisma.chatMember.findMany({
    where: {
      userId,
      chat: { isGroup: true },
    },
    include: {
      chat: {
        include: {
          messages: {
            include: { sender: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          members: { include: { user: true } },
        },
      },
    },
    orderBy: { chat: { createdAt: "desc" } },
  });

  const result = memberships.map((membership) => {
    const lastMessage = membership.chat.messages[0];
    return {
      id: membership.chat.id,
      name: membership.chat.name,
      description:
        membership.chat.name === "General"
          ? "Shared space for everyone in StyLnk"
          : `Group conversation with ${membership.chat.members.length} members`,
      memberCount: membership.chat.members.length,
      lastMessage: lastMessage
        ? `${lastMessage.sender.fullName}: ${lastMessage.text}`
        : "No messages yet",
      time: lastMessage ? toTime(lastMessage.createdAt) : "",
      unreadCount: 0,
    };
  });

  res.json(result);
});

app.get("/chats/:id/messages", auth, async (req, res) => {
  const chatId = asParam(req.params.id);
  if (!chatId) {
    return res.status(400).json({ message: "Missing chat id" });
  }
  const messages = await prisma.message.findMany({
    where: { chatId },
    include: { sender: true },
    orderBy: { createdAt: "asc" },
  });

  res.json(
    messages.map((m) => ({
      id: m.id,
      text: m.text,
      senderId: m.senderId,
      senderName: m.sender.fullName,
      createdAt: m.createdAt.toISOString(),
    })),
  );
});

app.post("/chats/:id/messages", auth, async (req: AuthRequest, res) => {
  const schema = z.object({ text: z.string().min(1).max(1000) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request body" });
  }

  const chatId = asParam(req.params.id);
  if (!chatId) {
    return res.status(400).json({ message: "Missing chat id" });
  }
  const userId = req.userId!;
  const membership = await prisma.chatMember.findUnique({
    where: { chatId_userId: { chatId, userId } },
  });
  if (!membership) {
    return res.status(403).json({ message: "Not a member of this chat" });
  }

  const message = await prisma.message.create({
    data: {
      chatId,
      senderId: userId,
      text: parsed.data.text.trim(),
    },
  });

  res.status(201).json({
    id: message.id,
    text: message.text,
    senderId: message.senderId,
    createdAt: message.createdAt.toISOString(),
  });
});

// ─── Calls ────────────────────────────────────────────────────────────────────

app.get("/calls", auth, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const calls = await prisma.call.findMany({
    where: {
      OR: [{ callerId: userId }, { recipientId: userId }],
    },
    include: {
      User_Call_callerIdToUser: { select: { id: true, fullName: true, avatarUrl: true } },
      User_Call_recipientIdToUser: { select: { id: true, fullName: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const result = calls.map((c) => {
    const isOutgoing = c.callerId === userId;
    const peer = isOutgoing ? c.User_Call_recipientIdToUser : c.User_Call_callerIdToUser;
    return {
      id: c.id,
      name: peer.fullName,
      peerId: peer.id,
      avatar: peer.avatarUrl,
      type: isOutgoing
        ? "outgoing"
        : c.status === "missed"
          ? "missed"
          : "incoming",
      callType: c.callType,
      duration: c.duration || null,
      time: toTime(c.createdAt),
      createdAt: c.createdAt.toISOString(),
    };
  });

  res.json(result);
});

app.post("/calls", auth, async (req: AuthRequest, res) => {
  const schema = z.object({
    recipientId: z.string().min(1),
    callType: z.enum(["audio", "video"]),
    status: z.enum(["incoming", "outgoing", "missed"]),
    duration: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request body" });
  }

  const { recipientId, callType, status, duration } = parsed.data;
  const callerId = req.userId!;

  if (recipientId === callerId) {
    return res.status(400).json({ message: "Cannot call yourself" });
  }

  const recipient = await prisma.user.findUnique({
    where: { id: recipientId },
  });
  if (!recipient) {
    return res.status(404).json({ message: "Recipient not found" });
  }

  const isReceiverLoggedCall = status === "incoming" || status === "missed";
  const call = await prisma.call.create({
    data: {
      callerId: isReceiverLoggedCall ? recipientId : callerId,
      recipientId: isReceiverLoggedCall ? callerId : recipientId,
      callType,
      status,
      duration,
    },
  });

  res.status(201).json({
    id: call.id,
    callerId: call.callerId,
    callType: call.callType,
    status: call.status,
    duration: call.duration,
    createdAt: call.createdAt.toISOString(),
  });
});

app.patch("/calls/:id", auth, async (req: AuthRequest, res) => {
  const schema = z.object({
    status: z.enum(["incoming", "outgoing", "missed"]).optional(),
    duration: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request body" });
  }

  const callId = asParam(req.params.id);
  if (!callId) return res.status(400).json({ message: "Missing call id" });
  const userId = req.userId!;

  const existing = await prisma.call.findUnique({ where: { id: callId } });
  if (!existing) return res.status(404).json({ message: "Call not found" });
  if (existing.callerId !== userId && existing.recipientId !== userId) {
    return res.status(403).json({ message: "Not authorised" });
  }

  const updated = await prisma.call.update({
    where: { id: callId },
    data: parsed.data,
  });

  res.json({
    id: updated.id,
    status: updated.status,
    duration: updated.duration,
  });
});

app.delete("/calls/:id", auth, async (req: AuthRequest, res) => {
  const callId = asParam(req.params.id);
  if (!callId) return res.status(400).json({ message: "Missing call id" });
  const userId = req.userId!;

  const existing = await prisma.call.findUnique({ where: { id: callId } });
  if (!existing) return res.status(404).json({ message: "Call not found" });
  if (existing.callerId !== userId && existing.recipientId !== userId) {
    return res.status(403).json({ message: "Not authorised" });
  }

  await prisma.call.delete({ where: { id: callId } });
  res.status(204).send();
});

// ─── SOCKET.IO CALL SYSTEM ─────────────────────────────────────────────

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Register logged-in user
  socket.on("register", (userId: string) => {
    users[userId] = socket.id;
    socketUsers[socket.id] = userId;
    console.log("Registered:", userId, socket.id);
  });

  // ─── CALL USER ─────────────────────────────
  socket.on("call-user", async ({ toSocketId, offer, callType }) => {
    const targetSocket = typeof toSocketId === "string" ? toSocketId : null;
    const normalizedCallType = callType === "video" ? "video" : "audio";
    const fromUserId = socketUsers[socket.id] ?? null;
    const toUserId = targetSocket ? socketUsers[targetSocket] ?? null : null;

    if (!targetSocket || !io.sockets.sockets.has(targetSocket)) {
      socket.emit("call-unavailable", {
        message: "User is not online",
      });
      return;
    }

    const callId = randomUUID();
    const caller = fromUserId
      ? await prisma.user.findUnique({
          where: { id: fromUserId },
          select: { fullName: true },
        })
      : null;

    activeCalls[callId] = {
      callerUserId: fromUserId,
      callerSocketId: socket.id,
      recipientUserId: toUserId,
      recipientSocketId: targetSocket,
      callType: normalizedCallType,
      status: "ringing",
      createdAt: new Date(),
    };

    io.to(targetSocket).emit("incoming-call", {
      callId,
      fromSocketId: socket.id,
      fromUserId,
      fromName: caller?.fullName ?? "Unknown caller",
      callType: normalizedCallType,
      offer,
    });

    socket.emit("call-ringing", {
      callId,
      toSocketId: targetSocket,
      toUserId,
    });
  });

  // ─── ANSWER CALL ───────────────────────────
  socket.on("answer-call", ({ callId, toSocketId, answer }) => {
    if (callId && activeCalls[callId]) {
      activeCalls[callId].status = "connected";
    }
    io.to(toSocketId).emit("call-answered", {
      callId,
      fromSocketId: socket.id,
      answer,
    });
  });

  // ─── ICE CANDIDATES ────────────────────────
  socket.on("ice-candidate", ({ callId, toSocketId, candidate }) => {
    io.to(toSocketId).emit("ice-candidate", {
      callId,
      fromSocketId: socket.id,
      candidate,
    });
  });

  // ─── END CALL ──────────────────────────────
  socket.on("end-call", ({ callId, toSocketId, reason }) => {
    if (callId && activeCalls[callId]) {
      activeCalls[callId].status = "ended";
      delete activeCalls[callId];
    }
    io.to(toSocketId).emit("call-ended", {
      callId,
      fromSocketId: socket.id,
      reason: reason || "ended",
    });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    for (const [callId, call] of Object.entries(activeCalls)) {
      if (call.callerSocketId === socket.id || call.recipientSocketId === socket.id) {
        const otherSocketId =
          call.callerSocketId === socket.id
            ? call.recipientSocketId
            : call.callerSocketId;
        io.to(otherSocketId).emit("call-ended", {
          callId,
          fromSocketId: socket.id,
          reason: "disconnected",
        });
        delete activeCalls[callId];
      }
    }

    delete socketUsers[socket.id];

    // cleanup mapping
    for (const userId in users) {
      if (users[userId] === socket.id) {
        delete users[userId];
        break;
      }
    }
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────

server.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
