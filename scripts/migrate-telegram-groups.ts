// Скрипт для миграции Telegram групп после изменения схемы
// Обрабатывает дубликаты групп, оставляя только одну группу на пользователя

import { prisma } from '../prisma/client';

async function migrateTelegramGroups() {
    console.log('🔄 Начинаем миграцию Telegram групп...');

    try {
        // Получаем всех пользователей с их группами
        const users = await prisma.user.findMany({
            include: {
                telegramGroup: true,
            },
        });

        // Находим пользователей с несколькими группами
        // Используем raw SQL для подсчета, так как после миграции должна быть только одна группа
        const usersWithMultipleGroups = await prisma.$queryRaw<Array<{ userId: number; count: bigint }>>`
            SELECT "userId", COUNT(*) as count
            FROM "TelegramGroup"
            GROUP BY "userId"
            HAVING COUNT(*) > 1
        `;

        console.log(`📊 Найдено ${usersWithMultipleGroups.length} пользователей с несколькими группами`);

        for (const { userId } of usersWithMultipleGroups) {
            // Получаем все группы пользователя, отсортированные по дате создания (новые первыми)
            const groups = await prisma.telegramGroup.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
            });

            if (groups.length > 1) {
                console.log(`👤 Пользователь ${userId}: найдено ${groups.length} групп`);

                // Оставляем первую (самую новую) группу
                const keepGroup = groups[0];
                const deleteGroups = groups.slice(1);

                console.log(`  ✅ Оставляем группу: ${keepGroup.groupId} (${keepGroup.title || 'без названия'})`);

                // Удаляем остальные группы
                for (const group of deleteGroups) {
                    console.log(`  ❌ Удаляем группу: ${group.groupId} (${group.title || 'без названия'})`);
                    await prisma.telegramGroup.delete({
                        where: { id: group.id },
                    });
                }
            }
        }

        console.log('✅ Миграция Telegram групп завершена успешно!');
    } catch (error) {
        console.error('❌ Ошибка при миграции Telegram групп:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Запускаем миграцию
migrateTelegramGroups()
    .then(() => {
        console.log('🎉 Скрипт миграции выполнен успешно');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Ошибка выполнения скрипта миграции:', error);
        process.exit(1);
    });
