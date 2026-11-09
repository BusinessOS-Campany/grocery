import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/shared/db";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { issueSession } from "@/features/auth/session";

const RP_ID = process.env.WEBAUTHN_RP_ID || "localhost";
const ORIGIN = process.env.WEBAUTHN_ORIGIN || "http://localhost:3000";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  let userId = String(body?.userId ?? "");
  const passkey = await db.passkey.findUnique({ where: { credentialId: body.id } });
  if (!passkey) return NextResponse.json({ error: "PASSKEY_NOT_FOUND" }, { status: 404 });
  if (!userId) userId = passkey.userId;

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.deletedAt || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
  }
  if (passkey.userId !== userId) {
    return NextResponse.json({ error: "PASSKEY_NOT_FOUND" }, { status: 404 });
  }

  const challengeRow = await db.passkeyChallenge.findFirst({
    where: { userId, type: "authenticate" },
    orderBy: { createdAt: "desc" },
  });
  if (challengeRow && challengeRow.expiresAt < new Date()) {
    await db.passkeyChallenge.delete({ where: { id: challengeRow.id } }).catch(() => {});
    return NextResponse.json({ error: "CHALLENGE_EXPIRED" }, { status: 400 });
  }
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
  } catch (e) {
    console.error("passkey verify error:", e);
    return NextResponse.json({ error: "VERIFY_FAILED", detail: e instanceof Error ? e.message : "unknown" }, { status: 400 });
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