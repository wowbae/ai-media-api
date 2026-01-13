import { Composer } from 'grammy';
import { prisma } from 'prisma/client';
import { pendingUserLinks } from './add.chat';

export const commandsComposer = new Composer();

// начало работы с ботом
commandsComposer.command('start', async (ctx) => {
    try {
        const telegramUserId = ctx.from?.id;
        if (!telegramUserId) {
            await ctx.reply('Ошибка: не удалось определить ваш Telegram ID');
            return;
        }

        // Парсим payload из команды: /start id123 -> userId = 123
        const payload = ctx.match as string;
        let userId: number | null = null;

        if (payload) {
            // Формат: id123 или просто 123
            const match = payload.match(/^id?(\d+)$/i);
            if (match) {
                userId = parseInt(match[1], 10);
            }
        }

        if (!userId) {
            await ctx.reply(
                'Добро пожаловать в AI Media Generator бота!\n\n' +
                'Для привязки группы используйте ссылку из веб-интерфейса.'
            );
            return;
        }

        // Проверяем существование пользователя
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            await ctx.reply('Ошибка: пользователь не найден');
            return;
        }

        // Сохраняем временную связь userId -> telegramUserId
        pendingUserLinks.set(userId, telegramUserId);

        // Обновляем telegramId пользователя если его еще нет
        if (!user.telegramId) {
            await prisma.user.update({
                where: { id: userId },
                data: { telegramId: telegramUserId.toString() }
            });
        }

        await ctx.reply(
            '✅ Ваш аккаунт успешно привязан!\n\n' +
            'Теперь добавьте этого бота в Telegram группу, куда вы хотите получать уведомления о генерации медиа.\n\n' +
            'После добавления бота в группу, она будет автоматически привязана к вашему аккаунту.'
        );

        console.log(`[Telegram Bot] Пользователь ${userId} привязал Telegram ID ${telegramUserId}`);
    } catch (error) {
        console.error('[Telegram Bot] Ошибка в команде /start:', error);
        await ctx.reply('Произошла ошибка. Попробуйте позже или обратитесь в поддержку.');
    }
});
