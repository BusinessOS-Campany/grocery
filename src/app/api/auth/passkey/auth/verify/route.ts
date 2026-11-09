import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/shared/db";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { issueSession } from "@/features/auth/session";

const RP_ID = process.env.WEBAUTHN_RP_ID || "localhost";
const ORIGIN = process.env.WEBAUTHN_ORIGIN || "http://localhost:3000";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const userId = String(body?.userId ?? "");
  if (!userId) return NextResponse.json({ error: "USER_ID_REQUIRED" }, { status: 400 });

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.deletedAt || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
  }

  const passkey = await db.passkey.findUnique({ where: { credentialId: body.id } });
  if (!passkey || passkey.userId !== userId) {
    return NextResponse.json({ error: "PASSKEY_NOT_FOUND" }, { status: 404 });
  }

  const challengeRow = await db.passkeyChallenge.findFirst({
    where: { userId, type: "authenticate", expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!challengeRow) return NextResponse.json({ error: "NO_CHALLENGE" }, { status: 400 });

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      credential: {
        id: passkey.credentialId,
        publicKey: new Uint8Array(passkey.publicKey),
        counter: Number(passkey.counter),
        transports: passkey.transports ? (passkey.transports.split(",") as any) : undefined,
      },
    });
  } catch {
    return NextResponse.json({ error: "VERIFY_FAILED" }, { status: 400 });
  }

  if (!verification.verified) {
    return NextResponse.json({ error: "VERIFY_FAILED" }, { status: 400 });
  }

  await db.passkey.update({
    where: { id: passkey.id },
    data: { counter: BigInt(verification.authenticationInfo.newCounter), lastUsedAt: new Date() },
  });
  await db.passkeyChallenge.delete({ where: { id: challengeRow.id } });

  await issueSession(userId, { ip: null, userAgent: null });

  return NextResponse.json({ ok: true, redirect: "/dashboard" });
}