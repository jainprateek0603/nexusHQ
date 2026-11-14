import { Prisma, PrismaClient } from "./generated/client/index.js";

const globalForPrisma = globalThis as { nexushqPrisma?: PrismaClient };

export const prisma =
  globalForPrisma.nexushqPrisma ??
  new PrismaClient({
    log: process.env.LOG_LEVEL === "debug" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.nexushqPrisma = prisma;
}

export { Prisma, PrismaClient };
