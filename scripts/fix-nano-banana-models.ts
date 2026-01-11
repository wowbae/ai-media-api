// Скрипт для обновления моделей NANO_BANANA в базе данных
// Запустите: bunx tsx scripts/fix-nano-banana-models.ts

import { prisma } from '../prisma/client';

async function fixNanoBananaModels() {
    console.log('🔄 Обновление моделей NANO_BANANA в базе данных...');

    try {
        // Используем raw SQL, так как Prisma Client уже использует новые имена enum
        // Обновляем MediaChat
        const chatsResult = await prisma.$executeRawUnsafe(`
            UPDATE "MediaChat"
            SET "model" = 'NANO_BANANA_PRO_KIEAI'
            WHERE "model" = 'NANO_BANANA' OR "model" = 'NANO_BANANA_PRO'
        `);
        console.log(`✅ Обновлено чатов: ${chatsResult}`);

        // Обновляем MediaRequest
        const requestsResult = await prisma.$executeRawUnsafe(`
            UPDATE "MediaRequest"
            SET "model" = 'NANO_BANANA_PRO_KIEAI'
            WHERE "model" = 'NANO_BANANA' OR "model" = 'NANO_BANANA_PRO'
        `);
        console.log(`✅ Обновлено запросов: ${requestsResult}`);

        console.log('✅ Обновление завершено!');
        console.log('📝 Теперь можно запустить: bunx prisma db push');
    } catch (error) {
        console.error('❌ Ошибка при обновлении:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

fixNanoBananaModels();
