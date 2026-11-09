import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { db } from "@/shared/db";
import { verifyRegistrationResponse } from "@simplewebauthn/server";

const RP_ID = process.env.WEBAUTHN_RP_ID || "localhost";
const ORIGIN = process.env.WEBAUTHN_ORIGIN || "http://localhost:3000";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await request.json();
  const challengeRow = await db.passkeyChallenge.findFirst({
    where: { userId: user.id, type: "register", expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!challengeRow) return NextResponse.json({ error: "NO_CHALLENGE" }, { status: 400 });

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
    });
  } catch {
    return NextResponse.json({ error: "VERIFY_FAILED" }, { status: 400 });
  }

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: "VERIFY_FAILED" }, { status: 400 });
  }

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

  await db.passkey.create({
    data: {
      userId: user.id,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey),
      counter: BigInt(credential.counter),
      transports: credential.transports?.join(",") ?? null,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      name: body.name ?? "Passkey",
    },
  });

  await db.passkeyChallenge.delete({ where: { id: challengeRow.id } });

  return NextResponse.json({ ok: true });
}