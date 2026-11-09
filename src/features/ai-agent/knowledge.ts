import "server-only";
import { db } from "@/shared/db";

export async function addKnowledge(type: string, content: string, userId?: string, approved = false, source?: string) {
  return db.aIKnowledge.create({ data: { type, content, userId: userId ?? null, approved, source: source ?? null } });
}

export async function listKnowledge(type?: string, approved?: boolean) {
  return db.aIKnowledge.findMany({
    where: { ...(type ? { type } : {}), ...(approved !== undefined ? { approved } : {}) },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function getRelevantKnowledge(query: string, limit = 5) {
  // Simple keyword match (no embeddings yet).
  const words = query.split(/\s+/).filter((w) => w.length > 2);
  if (words.length === 0) return [];
  const items = await db.aIKnowledge.findMany({ where: { approved: true }, take: 50 });
  const scored = items
    .map((k) => ({ k, score: words.reduce((s, w) => s + (k.content.toLowerCase().includes(w.toLowerCase()) ? 1 : 0), 0) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.k);
  return scored;
}