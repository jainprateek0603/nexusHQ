import argon2 from "argon2";
import { PrismaClient } from "../src/generated/client/index.js";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production" && process.env.SEED_CONFIRM !== "yes") {
    throw new Error("Refusing to seed production. Set SEED_CONFIRM=yes to continue.");
  }
  const passwordHash = await argon2.hash("NexusHQ-demo-1", { type: argon2.argon2id });
  const admin = await prisma.user.upsert({
    where: { email: "admin@nexushq.dev" },
    update: { isPlatformAdmin: true, name: "Nexus Admin" },
    create: {
      email: "admin@nexushq.dev",
      name: "Nexus Admin",
      passwordHash,
      isPlatformAdmin: true,
      emailVerified: new Date(),
    },
  });
  const ada = await prisma.user.upsert({
    where: { email: "ada@northwind.dev" },
    update: { name: "Ada Lovelace" },
    create: {
      email: "ada@northwind.dev",
      name: "Ada Lovelace",
      passwordHash,
      emailVerified: new Date(),
    },
  });
  const org = await prisma.organization.upsert({
    where: { slug: "northwind" },
    update: { name: "Northwind Labs" },
    create: { name: "Northwind Labs", slug: "northwind", plan: "PRO" },
  });
  await prisma.membership.upsert({
    where: { orgId_userId: { orgId: org.id, userId: ada.id } },
    update: { role: "OWNER" },
    create: { orgId: org.id, userId: ada.id, role: "OWNER" },
  });
  const grace = await prisma.user.upsert({
    where: { email: "grace@northwind.dev" },
    update: { name: "Grace Hopper" },
    create: { email: "grace@northwind.dev", name: "Grace Hopper", passwordHash, emailVerified: new Date() },
  });
  const guest = await prisma.user.upsert({
    where: { email: "guest@northwind.dev" },
    update: { name: "Lab Guest" },
    create: { email: "guest@northwind.dev", name: "Lab Guest", passwordHash, emailVerified: new Date() },
  });
  await prisma.membership.upsert({
    where: { orgId_userId: { orgId: org.id, userId: grace.id } },
    update: { role: "MEMBER" },
    create: { orgId: org.id, userId: grace.id, role: "MEMBER" },
  });
  await prisma.membership.upsert({
    where: { orgId_userId: { orgId: org.id, userId: guest.id } },
    update: { role: "GUEST" },
    create: { orgId: org.id, userId: guest.id, role: "GUEST" },
  });
  const project = await prisma.project.upsert({
    where: { orgId_key: { orgId: org.id, key: "LAB" } },
    update: { name: "Lab launch" },
    create: {
      orgId: org.id,
      name: "Lab launch",
      key: "LAB",
      description: "Get the calibration bench ready.",
      createdById: ada.id,
    },
  });
  await prisma.resourceGrant.upsert({
    where: { userId_resourceType_resourceId: { userId: guest.id, resourceType: "PROJECT", resourceId: project.id } },
    update: {},
    create: { orgId: org.id, userId: guest.id, resourceType: "PROJECT", resourceId: project.id },
  });
  const existingTasks = await prisma.task.count({ where: { projectId: project.id } });
  if (existingTasks === 0) {
    await prisma.task.createMany({
      data: [
        { orgId: org.id, projectId: project.id, title: "Order the lens", status: "IN_PROGRESS", priority: "HIGH", position: 1, createdById: ada.id, assigneeId: grace.id },
        { orgId: org.id, projectId: project.id, title: "Book the lab", status: "TODO", priority: "MEDIUM", position: 2, createdById: ada.id, dueDate: new Date("2026-10-16T00:00:00.000Z") },
        { orgId: org.id, projectId: project.id, title: "Publish the notes", status: "DONE", priority: "LOW", position: 3, createdById: grace.id },
      ],
    });
  }
  const doc = await prisma.document.upsert({
    where: { id: "seed-doc-launch-notes" },
    update: { title: "Launch notes", plainText: "Ship the calibration page before Thursday." },
    create: {
      id: "seed-doc-launch-notes",
      orgId: org.id,
      title: "Launch notes",
      plainText: "Ship the calibration page before Thursday. Ada owns the copy.",
      createdById: ada.id,
    },
  });
  await prisma.searchDocument.upsert({
    where: { sourceType_sourceId: { sourceType: "DOCUMENT", sourceId: doc.id } },
    update: { title: doc.title, body: doc.plainText },
    create: { orgId: org.id, sourceType: "DOCUMENT", sourceId: doc.id, title: doc.title, body: doc.plainText },
  });
  const channel = await prisma.channel.upsert({
    where: { id: "seed-channel-general" },
    update: {},
    create: { id: "seed-channel-general", orgId: org.id, name: "general", description: "Team room", type: "PUBLIC", createdById: ada.id },
  });
  await prisma.channelMember.upsert({
    where: { channelId_userId: { channelId: channel.id, userId: ada.id } },
    update: {},
    create: { channelId: channel.id, userId: ada.id, orgId: org.id },
  });
  await prisma.channelMember.upsert({
    where: { channelId_userId: { channelId: channel.id, userId: grace.id } },
    update: {},
    create: { channelId: channel.id, userId: grace.id, orgId: org.id },
  });
  const messageCount = await prisma.message.count({ where: { channelId: channel.id } });
  if (messageCount === 0) {
    await prisma.message.create({
      data: { orgId: org.id, channelId: channel.id, authorId: grace.id, body: "The lens is on the Thursday truck." },
    });
  }
  for (const flag of [
    { key: "ai.actions", description: "AI actions in the workspace" },
    { key: "docs.realtime", description: "Live document editing" },
    { key: "chat.threads", description: "Message threads" },
  ]) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: { enabled: true, description: flag.description },
      create: { ...flag, enabled: true, orgAllowlist: [] },
    });
  }
  console.log(`Seeded ${org.slug}. Sign in as ${admin.email}, ada@northwind.dev, grace@northwind.dev, or guest@northwind.dev. Password: NexusHQ-demo-1`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
