/**
 * Script to delete all passkeys that were registered on localhost.
 * Run this after logging in once with password, then re-register on Vercel.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔐 Delete Passkeys Registered on Localhost");
  console.log("------------------------------------------");

  const userId = process.argv[2];
  if (!userId) {
    console.error("Usage: tsx scripts/delete-old-passkeys.ts <user-id>");
    process.exit(1);
  }

  try {
    // Get passkeys to check which ones are for localhost
    const passkeys = await prisma.passkey.findMany({
      where: { userId },
      include: {
        challengeHistory: true,
      },
    });

    if (passkeys.length === 0) {
      console.log(`✅ No passkeys found for user ID: ${userId}`);
      return;
    }

    const localhostPasskeys = passkeys.filter((pk) => 
      pk.credentialId?.startsWith("localhost") || 
      !pk.credentialId?.includes("grocery")
    );

    if (localhostPasskeys.length === 0) {
      console.log(`✅ All passkeys for user ${userId} appear to be registered on the correct domain.`);
      console.log("   No deletion needed.");
      return;
    }

    console.log(`\n👤 Found ${passkeys.length} total passkeys:`);
    localhostPasskeys.forEach((pk, i) => {
      console.log(`  ${i + 1}. Credential: ${pk.credentialId?.substring(0, 20)}... 
     Status: ${pk.deviceType || 'unknown'}`);
    });

    const confirmed = confirm("Delete these localhost passkeys? (yes/no)");
    if (confirmed !== "yes") {
      console.log("\n✅ Operation cancelled by user.");
      return;
    }

    // Delete only localhost passkeys
    await prisma.passkey.deleteMany({
      where: {
        userId,
        credentialId: {
          notLike: "%grocery%",
          notLike: "file://%*",
        },
      },
    });

    console.log("\n✅ Deleted all passkeys that were NOT registered on the Vercel domain.");
    console.log("\n📝 Next steps:");
    console.log("1. Go to https://grocery-team.vercel.app/settings/security");
    console.log("2. Click 'تفعيل بصمة جديدة'");
    console.log("3. Complete registration on the Vercel domain");
    console.log("4. Log out and try 'الدخول بالبصمة' again");

  } catch (e) {
    console.error("❌ Error:", e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// @ts-ignore - Node.js global in scripts
global.confirm = prompt || (() => "no");

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
