import "dotenv/config";
import cors from "cors";
import express from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

const jwtSecret = process.env.JWT_SECRET || "change-this-secret";
const port = Number(process.env.PORT || 4000);

type AuthRequest = express.Request & { userId?: string };

const auth = (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
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

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
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
    user: { id: user.id, fullName: user.fullName, email: user.email },
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
    user: { id: user.id, fullName: user.fullName, email: user.email },
  });
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
    const oneToOnePeer = m.chat.members.find((cm) => cm.userId !== userId)?.user;
    return {
      id: m.chat.id,
      name: m.chat.isGroup ? m.chat.name : oneToOnePeer?.fullName || m.chat.name,
      isGroup: m.chat.isGroup,
      isOnline: false,
      unreadCount: 0,
      lastMessage: last?.text || "No messages yet",
      time: last ? toTime(last.createdAt) : "",
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

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
