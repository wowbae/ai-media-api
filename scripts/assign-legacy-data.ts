import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("🔄 Starting legacy data migration...");

    const adminEmail = process.env.ADMIN_EMAIL;

    if (!adminEmail) {
        console.error("❌ ADMIN_EMAIL environment variable is not set.");
        process.exit(1);
    }

    // Find admin user
    const adminUser = await prisma.user.findUnique({
        where: { email: adminEmail },
    });

    if (!adminUser) {
        console.error(`❌ Admin user with email ${adminEmail} not found. Please register/create it first.`);
        process.exit(1);
    }

    if (adminUser.role !== UserRole.ADMIN) {
        console.warn(`⚠️ User ${adminEmail} is not an ADMIN. Proceeding anyway...`);
    }

    console.log(`✅ Found admin user: ${adminUser.email} (ID: ${adminUser.id})`);

    // 1. Update MediaChats
    const chatsUpdate = await prisma.mediaChat.updateMany({
        where: { userId: null },
        data: { userId: adminUser.id },
    });
    console.log(`✅ Assigned ${chatsUpdate.count} legacy MediaChats to admin.`);

    // 2. Update MediaRequests
    const requestsUpdate = await prisma.mediaRequest.updateMany({
        where: { userId: null },
        data: { userId: adminUser.id },
    });
    console.log(`✅ Assigned ${requestsUpdate.count} legacy MediaRequests to admin.`);

    console.log("🎉 Migration completed successfully.");
}

main()
    .catch((e) => {
        console.error("❌ Migration failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
