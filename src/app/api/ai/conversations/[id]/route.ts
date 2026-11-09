import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { getConversation, renameConversation, archiveConversation, deleteConversation } from "@/features/ai-agent/conversations";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { id } = await params;
  const conv = await getConversation(user.id, id);
  if (!conv) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ conversation: conv });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { id } = await params;
  let body: { title?: string; archived?: boolean } = {};
  try { body = await request.json(); } catch {}
  if (typeof body.title === "string") await renameConversation(user.id, id, body.title);
  if (typeof body.archived === "boolean") await archiveConversation(user.id, id, body.archived);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { id } = await params;
  await deleteConversation(user.id, id);
  return NextResponse.json({ ok: true });
}