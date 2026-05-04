import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const password = "SeedPass123!";
const passwordHashPromise = bcrypt.hash(password, 10);

const users = [
  {
    id: "seed-user-ava",
    fullName: "Ava Thompson",
    email: "ava@seed.stylnk.local",
  },
  {
    id: "seed-user-noah",
    fullName: "Noah Martinez",
    email: "noah@seed.stylnk.local",
  },
  {
    id: "seed-user-mia",
    fullName: "Mia Chen",
    email: "mia@seed.stylnk.local",
  },
  {
    id: "seed-user-liam",
    fullName: "Liam Patel",
    email: "liam@seed.stylnk.local",
  },
  {
    id: "seed-user-zoe",
    fullName: "Zoe Walker",
    email: "zoe@seed.stylnk.local",
  },
  {
    id: "seed-user-ethan",
    fullName: "Ethan Rivera",
    email: "ethan@seed.stylnk.local",
  },
] as const;

const chats = [
  {
    id: "seed-chat-ava-noah",
    name: "Noah Martinez",
    isGroup: false,
    memberIds: ["seed-user-ava", "seed-user-noah"],
  },
  {
    id: "seed-chat-mia-liam",
    name: "Liam Patel",
    isGroup: false,
    memberIds: ["seed-user-mia", "seed-user-liam"],
  },
  {
    id: "seed-chat-zoe-ethan",
    name: "Ethan Rivera",
    isGroup: false,
    memberIds: ["seed-user-zoe", "seed-user-ethan"],
  },
  {
    id: "seed-group-design",
    name: "Design Circle",
    isGroup: true,
    memberIds: ["seed-user-ava", "seed-user-mia", "seed-user-zoe"],
  },
  {
    id: "seed-group-product",
    name: "Product Sprint",
    isGroup: true,
    memberIds: ["seed-user-noah", "seed-user-liam", "seed-user-ethan"],
  },
  {
    id: "seed-group-launch",
    name: "Launch War Room",
    isGroup: true,
    memberIds: [
      "seed-user-ava",
      "seed-user-noah",
      "seed-user-mia",
      "seed-user-liam",
      "seed-user-zoe",
      "seed-user-ethan",
    ],
  },
] as const;

const messagePlan = [
  {
    chatId: "seed-chat-ava-noah",
    start: "2026-04-24T09:00:00.000Z",
    entries: [
      ["seed-user-ava", "Hey Noah, did the client approve the color pass?"],
      ["seed-user-noah", "Yep, approved this morning."],
      ["seed-user-ava", "Nice. I will package the final mockups after lunch."],
      ["seed-user-noah", "Perfect. I will line up the release notes."],
      ["seed-user-ava", "Can you also drop the asset list in shared docs?"],
      ["seed-user-noah", "Already on it."],
    ],
  },
  {
    chatId: "seed-chat-mia-liam",
    start: "2026-04-24T11:15:00.000Z",
    entries: [
      ["seed-user-mia", "Do we want pagination or infinite scroll here?"],
      ["seed-user-liam", "I would keep pagination for now."],
      ["seed-user-mia", "Works for me. Easier to reason about analytics too."],
      ["seed-user-liam", "Exactly. We can revisit once usage grows."],
      ["seed-user-mia", "I will keep page size at 20."],
    ],
  },
  {
    chatId: "seed-chat-zoe-ethan",
    start: "2026-04-25T03:45:00.000Z",
    entries: [
      ["seed-user-zoe", "Morning. Are you free to sanity-check notifications?"],
      ["seed-user-ethan", "Yes, give me ten minutes."],
      ["seed-user-zoe", "Great, I found one duplicate badge state."],
      ["seed-user-ethan", "I see it. The reset path is missing on logout."],
      ["seed-user-zoe", "That explains it."],
      ["seed-user-ethan", "Patch incoming shortly."],
    ],
  },
  {
    chatId: "seed-group-design",
    start: "2026-04-25T07:00:00.000Z",
    entries: [
      ["seed-user-mia", "Sharing three card layout options in a minute."],
      ["seed-user-ava", "Please include a denser one for chat-heavy screens."],
      ["seed-user-zoe", "And one mobile-first version."],
      ["seed-user-mia", "Uploaded. Option B feels strongest to me."],
      ["seed-user-ava", "Agreed. The spacing is calmer."],
      ["seed-user-zoe", "Option B gets my vote too."],
    ],
  },
  {
    chatId: "seed-group-product",
    start: "2026-04-26T02:20:00.000Z",
    entries: [
      ["seed-user-noah", "Sprint check-in: blockers?"],
      ["seed-user-liam", "Backend is good. I just need final copy."],
      ["seed-user-ethan", "I am finishing notification settings."],
      ["seed-user-noah", "Nice. I will update the board before standup."],
      ["seed-user-liam", "Thanks."],
    ],
  },
  {
    chatId: "seed-group-launch",
    start: "2026-04-27T04:10:00.000Z",
    entries: [
      ["seed-user-ava", "Launch checklist is live."],
      ["seed-user-noah", "Support macros are ready."],
      ["seed-user-mia", "Visual QA pass complete on mobile."],
      ["seed-user-liam", "API health checks are green."],
      ["seed-user-zoe", "Help center links are updated."],
      ["seed-user-ethan", "Push notification smoke test passed."],
      ["seed-user-noah", "Good stuff. We are in a decent place."],
      ["seed-user-ava", "Let us freeze changes one hour before release."],
    ],
  },
] as const;

const generalChatId = "general-chat";

const addMinutes = (start: string, minutes: number) =>
  new Date(new Date(start).getTime() + minutes * 60 * 1000);

async function main() {
  const passwordHash = await passwordHashPromise;
  const seedUserIds = users.map((user) => user.id);
  const seededChatIds = chats.map((chat) => chat.id);

  await prisma.message.deleteMany({
    where: {
      OR: [
        { chatId: { in: seededChatIds } },
        { senderId: { in: seedUserIds } },
      ],
    },
  });

  await prisma.chatMember.deleteMany({
    where: {
      OR: [
        { chatId: { in: seededChatIds } },
        { userId: { in: seedUserIds } },
      ],
    },
  });

  await prisma.chat.deleteMany({
    where: { id: { in: seededChatIds } },
  });

  await prisma.user.deleteMany({
    where: { id: { in: seedUserIds } },
  });

  await prisma.chat.upsert({
    where: { id: generalChatId },
    update: { name: "General", isGroup: true },
    create: {
      id: generalChatId,
      name: "General",
      isGroup: true,
    },
  });

  for (const user of users) {
    await prisma.user.create({
      data: {
        ...user,
        passwordHash,
      },
    });
  }

  for (const chat of chats) {
    await prisma.chat.create({
      data: {
        id: chat.id,
        name: chat.name,
        isGroup: chat.isGroup,
      },
    });

    for (const memberId of chat.memberIds) {
      await prisma.chatMember.create({
        data: {
          chatId: chat.id,
          userId: memberId,
        },
      });
    }
  }

  for (const user of users) {
    await prisma.chatMember.upsert({
      where: {
        chatId_userId: {
          chatId: generalChatId,
          userId: user.id,
        },
      },
      update: {},
      create: {
        chatId: generalChatId,
        userId: user.id,
      },
    });
  }

  const messages = messagePlan.flatMap((conversation) =>
    conversation.entries.map(([senderId, text], index) => ({
      chatId: conversation.chatId,
      senderId,
      text,
      createdAt: addMinutes(conversation.start, index * 6),
    })),
  );

  for (const message of messages) {
    await prisma.message.create({ data: message });
  }

  const grouped = await prisma.message.findMany({
    where: { chatId: { in: seededChatIds } },
    orderBy: [{ chatId: "asc" }, { createdAt: "asc" }],
    select: {
      chatId: true,
      text: true,
      createdAt: true,
    },
  });

  const summary = grouped.reduce<Record<string, number>>((acc, message) => {
    acc[message.chatId] = (acc[message.chatId] || 0) + 1;
    return acc;
  }, {});

  console.log("Seeded users:", users.length);
  console.log("Seeded chats:", chats.length + 1);
  console.log("Seeded messages by conversation_id:", summary);
  console.log("Shared seed password:", password);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
