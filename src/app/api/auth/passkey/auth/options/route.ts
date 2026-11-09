import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/shared/db";
import { generateAuthenticationOptions } from "@simplewebauthn/server";

const RP_ID = process.env.WEBAUTHN_RP_ID || "localhost";

export async function POST(request: NextRequest) {
  try {
  const body = await request.json().catch(() => ({}));
  const identity = String(body?.identity ?? "").trim().toLowerCase();

  let user = null as any;
  let passkeys: any[] = [];
  if (identity) {
    user = await db.user.findFirst({
      where: { OR: [{ username: identity }, { email: identity }], deletedAt: null, status: "ACTIVE" },
    });
    if (!user) return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
    passkeys = await db.passkey.findMany({ where: { userId: user.id } });
    if (passkeys.length === 0) return NextResponse.json({ error: "NO_PASSKEYS" }, { status: 404 });
  }

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    allowCredentials: passkeys.map((p) => ({
      id: p.credentialId,
      transports: p.transports ? (p.transports.split(",") as any) : undefined,
    })),
    userVerification: "preferred",
  });

  await db.passkeyChallenge.create({
    data: {
      userId: user?.id ?? null,
      challenge: options.challenge,
      type: "authenticate",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    },
  });

  return NextResponse.json({ ...options, userId: user?.id ?? null });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "SERVER_ERROR" }, { status: 500 });
  }
}