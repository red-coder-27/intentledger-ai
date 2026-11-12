import dns from "node:dns";
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {}

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  let result = url;
  if (!result.includes("connect_timeout")) {
    const sep = result.includes("?") ? "&" : "?";
    result = `${result}${sep}connect_timeout=30`;
  }
  if (!result.includes("pool_timeout")) {
    const sep = result.includes("?") ? "&" : "?";
    result = `${result}${sep}pool_timeout=30`;
  }
  return result;
}

const dbUrl = getDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

