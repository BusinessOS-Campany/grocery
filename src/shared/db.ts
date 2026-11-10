import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  // Use Supabase's transaction pooler (port 6543) to avoid session-mode
  // connection exhaustion (max 15 clients) under serverless concurrency.
  const txUrl = url.replace(/:5432(\/|$)/, ":6543$1");
  // pg does not understand Prisma's ?schema= convention — strip it and pass explicitly.
  const pgUrl = txUrl.replace(/\?schema=[^&]*$/, "");
  // Small per-instance pool: on serverless every lambda opens its own pool and
  // Supabase's session-mode pooler only allows ~15 concurrent sessions.
  const adapter = new PrismaPg(
    { connectionString: pgUrl, max: 5, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 15_000 },
    { schema: "public" },
  );
  return new PrismaClient({ adapter, log: ["warn", "error"] });
}

function getClient(): PrismaClient {
  if (!globalForPrisma.prisma) globalForPrisma.prisma = createClient();
  return globalForPrisma.prisma;
}

// Lazy proxy so importing this module never throws during build-time page-data
// collection — DATABASE_URL is only required when a query actually runs.
export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getClient();
    const value = Reflect.get(client as object, prop);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
