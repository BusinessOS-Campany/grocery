-- CreateTable
CREATE TABLE "passkey_challenges" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "challenge" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "passkey_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "passkey_challenges_challenge_key" ON "passkey_challenges"("challenge");

-- CreateIndex
CREATE INDEX "passkey_challenges_userId_type_idx" ON "passkey_challenges"("userId", "type");