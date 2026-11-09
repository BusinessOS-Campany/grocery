import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { db } from "@/shared/db";
import { generateRegistrationOptions } from "@simplewebauthn/server";

const RP_NAME = "Grocery ERP";
const RP_ID = process.env.WEBAUTHN_RP_ID || "localhost";
const ORIGIN = process.env.WEBAUTHN_ORIGIN || "http://localhost:3000";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const existing = await db.passkey.findMany({ where: { userId: user.id }, select: { credentialId: true, transports: true } });

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: new TextEncoder().encode(user.id),
    userName: user.username,
    userDisplayName: user.fullName,
    attestationType: "none",
    excludeCredentials: existing.map((p) => ({
      id: p.credentialId,
      transports: p.transports ? (p.transports.split(",") as any) : undefined,
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  await db.passkeyChallenge.create({
    data: {
      userId: user.id,
      challenge: options.challenge,
      type: "register",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    },
  });

  return NextResponse.json(options);
}