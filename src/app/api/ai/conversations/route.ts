import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { listConversations, createConversation } from "@/features/ai-agent/conversations";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const convs = await listConversations(user.id);
  return NextResponse.json({ conversations: convs });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  let body: { title?: string } = {};
  try { body = await request.json(); } catch {}
  const conv = await createConversation(user.id, body.title);
  return NextResponse.json({ conversation: conv });
}