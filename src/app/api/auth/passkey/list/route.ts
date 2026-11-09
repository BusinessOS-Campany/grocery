import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { db } from "@/shared/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const passkeys = await db.passkey.findMany({ where: { userId: user.id }, select: { id: true, name: true, deviceType: true, createdAt: true, lastUsedAt: true } });
  return NextResponse.json({ passkeys });
}