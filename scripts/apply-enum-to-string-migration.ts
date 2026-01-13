// Скрипт для применения миграции enum -> string
// Этот скрипт применяет миграцию напрямую через SQL, обходя проблему с shadow database

import { prisma } from '../prisma/client';

async function applyMigration() {
    console.log('🔄 Начинаем применение миграции enum -> string...');

    try {
        // ==================== Шаг 1: Добавление telegramId в User ====================
        console.log('📝 Шаг 1: Добавление telegramId в User...');
        await prisma.$executeRawUnsafe(`
            ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "telegramId" TEXT;
        `);
        await prisma.$executeRawUnsafe(`
            CREATE INDEX IF NOT EXISTS "User_telegramId_idx" ON "User"("telegramId");
        `);
        console.log('✅ Шаг 1 выполнен');

        // ==================== Шаг 2: Изменение TelegramGroup ====================
        console.log('📝 Шаг 2: Изменение TelegramGroup...');

        // Удаляем старый unique constraint
        await prisma.$executeRawUnsafe(`
            ALTER TABLE "TelegramGroup" DROP CONSTRAINT IF EXISTS "TelegramGroup_userId_groupId_key";
        `);

        // Удаляем колонку isActive
        await prisma.$executeRawUnsafe(`
            ALTER TABLE "TelegramGroup" DROP COLUMN IF EXISTS "isActive";
        `);

        // Конвертируем groupId из BigInt в String
        const groupIdType = await prisma.$queryRawUnsafe<Array<{ data_type: string }>>(`
            SELECT data_type
            FROM information_schema.columns
            WHERE table_name = 'TelegramGroup' AND column_name = 'groupId'
        `);

        if (groupIdType.length > 0 && groupIdType[0].data_type !== 'text') {
            console.log('  Конвертируем groupId из BigInt в String...');
            await prisma.$executeRawUnsafe(`
                ALTER TABLE "TelegramGroup" ADD COLUMN IF NOT EXISTS "groupId_temp" TEXT;
            `);
            await prisma.$executeRawUnsafe(`
                UPDATE "TelegramGroup" SET "groupId_temp" = "groupId"::TEXT WHERE "groupId_temp" IS NULL;
            `);
            await prisma.$executeRawUnsafe(`
                ALTER TABLE "TelegramGroup" DROP COLUMN IF EXISTS "groupId";
            `);
            await prisma.$executeRawUnsafe(`
                ALTER TABLE "TelegramGroup" RENAME COLUMN "groupId_temp" TO "groupId";
            `);
            await prisma.$executeRawUnsafe(`
                ALTER TABLE "TelegramGroup" ALTER COLUMN "groupId" SET NOT NULL;
            `);
        }

        await prisma.$executeRawUnsafe(`
            CREATE INDEX IF NOT EXISTS "TelegramGroup_groupId_idx" ON "TelegramGroup"("groupId");
        `);

        // Добавляем unique constraint на userId (one-to-one связь)
        // Проверяем, существует ли constraint
        const userIdConstraint = await prisma.$queryRawUnsafe<Array<{ constraint_name: string }>>(`
            SELECT constraint_name
            FROM information_schema.table_constraints
            WHERE table_name = 'TelegramGroup'
            AND constraint_name = 'TelegramGroup_userId_key'
        `);

        if (userIdConstraint.length === 0) {
            await prisma.$executeRawUnsafe(`
                ALTER TABLE "TelegramGroup" ADD CONSTRAINT "TelegramGroup_userId_key" UNIQUE ("userId");
            `);
        }
        console.log('✅ Шаг 2 выполнен');

        // ==================== Шаг 3: Замена enum MediaModel на String ====================
        console.log('📝 Шаг 3: Замена enum MediaModel на String...');

        // Проверяем тип колонки MediaChat.model
        const mediaChatModelType = await prisma.$queryRawUnsafe<Array<{ data_type: string }>>(`
            SELECT data_type
            FROM information_schema.columns
            WHERE table_name = 'MediaChat' AND column_name = 'model'
        `);

        if (mediaChatModelType.length > 0 && mediaChatModelType[0].data_type !== 'text') {
            console.log('  Конвертируем MediaChat.model...');
            await prisma.$executeRawUnsafe(`
                ALTER TABLE "MediaChat" ADD COLUMN IF NOT EXISTS "model_temp" TEXT;
            `);
            await prisma.$executeRawUnsafe(`
                UPDATE "MediaChat" SET "model_temp" = "model"::TEXT WHERE "model_temp" IS NULL;
            `);
            await prisma.$executeRawUnsafe(`
                ALTER TABLE "MediaChat" DROP COLUMN IF EXISTS "model";
            `);
            await prisma.$executeRawUnsafe(`
                ALTER TABLE "MediaChat" RENAME COLUMN "model_temp" TO "model";
            `);
            await prisma.$executeRawUnsafe(`
                ALTER TABLE "MediaChat" ALTER COLUMN "model" SET NOT NULL;
            `);
            await prisma.$executeRawUnsafe(`
                ALTER TABLE "MediaChat" ALTER COLUMN "model" SET DEFAULT 'NANO_BANANA_PRO_KIEAI';
            `);
        }

        await prisma.$executeRawUnsafe(`
            CREATE INDEX IF NOT EXISTS "MediaChat_model_idx" ON "MediaChat"("model");
        `);

        // Проверяем тип колонки MediaRequest.model
        const mediaRequestModelType = await prisma.$queryRawUnsafe<Array<{ data_type: string }>>(`
            SELECT data_type
            FROM information_schema.columns
            WHERE table_name = 'MediaRequest' AND column_name = 'model'
        `);

        if (mediaRequestModelType.length > 0 && mediaRequestModelType[0].data_type !== 'text') {
            console.log('  Конвертируем MediaRequest.model...');
            await prisma.$executeRawUnsafe(`
                ALTER TABLE "MediaRequest" ADD COLUMN IF NOT EXISTS "model_temp" TEXT;
            `);
            await prisma.$executeRawUnsafe(`
                UPDATE "MediaRequest" SET "model_temp" = "model"::TEXT WHERE "model" IS NOT NULL;
            `);
            await prisma.$executeRawUnsafe(`
                ALTER TABLE "MediaRequest" DROP COLUMN IF EXISTS "model";
            `);
            await prisma.$executeRawUnsafe(`
                ALTER TABLE "MediaRequest" RENAME COLUMN "model_temp" TO "model";
            `);
        }

        await prisma.$executeRawUnsafe(`
            CREATE INDEX IF NOT EXISTS "MediaRequest_model_idx" ON "MediaRequest"("model");
        `);
        console.log('✅ Шаг 3 выполнен');

        // ==================== Шаг 4: Замена enum MediaType на String ====================
        console.log('📝 Шаг 4: Замена enum MediaType на String...');

        const mediaFileTypeType = await prisma.$queryRawUnsafe<Array<{ data_type: string }>>(`
            SELECT data_type
            FROM information_schema.columns
            WHERE table_name = 'MediaFile' AND column_name = 'type'
        `);

        if (mediaFileTypeType.length > 0 && mediaFileTypeType[0].data_type !== 'text') {
            console.log('  Конвертируем MediaFile.type...');
            await prisma.$executeRawUnsafe(`
                ALTER TABLE "MediaFile" ADD COLUMN IF NOT EXISTS "type_temp" TEXT;
            `);
            await prisma.$executeRawUnsafe(`
                UPDATE "MediaFile" SET "type_temp" = "type"::TEXT WHERE "type_temp" IS NULL;
            `);
            await prisma.$executeRawUnsafe(`
                ALTER TABLE "MediaFile" DROP COLUMN IF EXISTS "type";
            `);
            await prisma.$executeRawUnsafe(`
                ALTER TABLE "MediaFile" RENAME COLUMN "type_temp" TO "type";
            `);
            await prisma.$executeRawUnsafe(`
                ALTER TABLE "MediaFile" ALTER COLUMN "type" SET NOT NULL;
            `);
        }

        console.log('✅ Шаг 4 выполнен');

        // ==================== Шаг 5: Замена enum RequestStatus на String ====================
        console.log('📝 Шаг 5: Замена enum RequestStatus на String...');

        const mediaRequestStatusType = await prisma.$queryRawUnsafe<Array<{ data_type: string }>>(`
            SELECT data_type
            FROM information_schema.columns
            WHERE table_name = 'MediaRequest' AND column_name = 'status'
        `);

        if (mediaRequestStatusType.length > 0 && mediaRequestStatusType[0].data_type !== 'text') {
            console.log('  Конвертируем MediaRequest.status...');
            await prisma.$executeRawUnsafe(`
                ALTER TABLE "MediaRequest" ADD COLUMN IF NOT EXISTS "status_temp" TEXT;
            `);
            await prisma.$executeRawUnsafe(`
                UPDATE "MediaRequest" SET "status_temp" = "status"::TEXT WHERE "status_temp" IS NULL;
            `);
            await prisma.$executeRawUnsafe(`
                ALTER TABLE "MediaRequest" DROP COLUMN IF EXISTS "status";
            `);
            await prisma.$executeRawUnsafe(`
                ALTER TABLE "MediaRequest" RENAME COLUMN "status_temp" TO "status";
            `);
            await prisma.$executeRawUnsafe(`
                ALTER TABLE "MediaRequest" ALTER COLUMN "status" SET NOT NULL;
            `);
            await prisma.$executeRawUnsafe(`
                ALTER TABLE "MediaRequest" ALTER COLUMN "status" SET DEFAULT 'PENDING';
            `);
        }

        console.log('✅ Шаг 5 выполнен');

        console.log('✅ Миграция успешно применена!');

    } catch (error) {
        console.error('❌ Ошибка при применении миграции:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

applyMigration()
    .then(() => {
        console.log('🎉 Скрипт миграции выполнен успешно');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Ошибка выполнения скрипта миграции:', error);
        process.exit(1);
    });
