import "server-only";
import { db } from "@/shared/db";

export async function createConversation(userId: string, title?: string) {
  return db.aIConversation.create({ data: { userId, title: title ?? "New conversation" } });
}

export async function listConversations(userId: string, archived = false) {
  return db.aIConversation.findMany({
    where: { userId, archived },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: { id: true, title: true, updatedAt: true, archived: true },
  });
}

export async function getConversation(userId: string, id: string) {
  return db.aIConversation.findFirst({
    where: { id, userId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
}

export async function addMessage(conversationId: string, role: string, content: string, toolCalls?: unknown, toolResults?: unknown) {
  await db.aIMessage.create({
    data: { conversationId, role, content, toolCalls: toolCalls as any, toolResults: toolResults as any },
  });
  await db.aIConversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
}

export async function renameConversation(userId: string, id: string, title: string) {
  return db.aIConversation.updateMany({ where: { id, userId }, data: { title } });
}

export async function archiveConversation(userId: string, id: string, archived: boolean) {
  return db.aIConversation.updateMany({ where: { id, userId }, data: { archived } });
}

export async function deleteConversation(userId: string, id: string) {
  return db.aIConversation.deleteMany({ where: { id, userId } });
}

export async function autoTitle(userId: string, id: string, firstUserMessage: string) {
  const title = firstUserMessage.slice(0, 40);
  await db.aIConversation.updateMany({ where: { id, userId, title: "New conversation" }, data: { title } });
}