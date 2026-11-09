/**
 * Script to delete all passkey challenges and reset passkeys for a user.
 * Use this after re-registering on Vercel to clean up old localhost challenges.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔐 Reset Passkey Challenges Script");
  console.log("-----------------------------------");

  const userId = process.argv[2];
  if (!userId) {
    console.error("Usage: tsx scripts/reset-passkeys.ts <user-id>");
    process.exit(1);
  }

  try {
    // Delete old challenges
    await prisma.passkeyChallenge.deleteMany({
      where: { userId },
    });
    console.log(`✅ Deleted all challenges for user ID: ${userId}`);

    // Reset passkeys counter (optional)
    await prisma.passkey.updateMany({
      where: { userId },
      data: { counter: BigInt(0), lastUsedAt: null },
    });
    console.log(`✅ Reset counters for all passkeys of user ID: ${userId}`);

    console.log("🎯 Ready to register a new passkey on Vercel!");
  } catch (e) {
    console.error("❌ Error:", e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
