import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { db } from "@/shared/db";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { id } = await params;
  const pk = await db.passkey.findUnique({ where: { id } });
  if (!pk || pk.userId !== user.id) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  await db.passkey.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}