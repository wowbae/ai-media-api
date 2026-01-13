// следим за добавлением в чаты
import { Composer } from 'grammy';
import { prisma } from 'prisma/client';

export const addChatComposer = new Composer();

// Временное хранилище для связи userId -> telegramUserId (экспортируем для использования в commands.ts)
export const pendingUserLinks = new Map<number, number>();

// Обработчик добавления бота в чат
addChatComposer.on(':new_chat_members:me', async (ctx) => {
    try {
        const chatTitle = ctx.chat.title || ctx.chat.id.toString();
        const telegramGroupId = ctx.chat.id.toString();
        const telegramUserId = ctx.from?.id;

        console.log(`[Telegram Bot] Бот добавлен в чат: ${chatTitle} (ID: ${telegramGroupId})`);

        if (!telegramUserId) {
            console.error('[Telegram Bot] Не удалось определить telegramUserId');
            return;
        }

        // Ищем пользователя по telegramUserId
        let user = await prisma.user.findFirst({
            where: { telegramId: telegramUserId.toString() }
        });

        // Если не нашли по telegramId, ищем по временной связи из команды /start
        if (!user) {
            // Ищем userId по telegramUserId в временном хранилище
            let userId: number | null = null;
            for (const [uid, tgId] of pendingUserLinks.entries()) {
                if (tgId === telegramUserId) {
                    userId = uid;
                    break;
                }
            }

            if (userId) {
                user = await prisma.user.findUnique({
                    where: { id: userId }
                });

                // Обновляем telegramId если пользователь найден
                if (user && !user.telegramId) {
                    await prisma.user.update({
                        where: { id: userId },
                        data: { telegramId: telegramUserId.toString() }
                    });
                }

                // Удаляем из временного хранилища
                pendingUserLinks.delete(userId);
            }
        }

        if (!user) {
            console.warn(`[Telegram Bot] Пользователь с telegramId ${telegramUserId} не найден`);
            await ctx.reply(
                '⚠️ Не удалось привязать группу к аккаунту.\n\n' +
                'Пожалуйста, сначала используйте команду /start с ссылкой из веб-интерфейса.'
            );
            return;
        }

        // Создаем или обновляем TelegramGroup (заменяем старую если есть)
        const group = await prisma.telegramGroup.upsert({
            where: { userId: user.id },
            update: {
                groupId: telegramGroupId,
                title: chatTitle,
            },
            create: {
                userId: user.id,
                groupId: telegramGroupId,
                title: chatTitle,
            }
        });

        console.log(`[Telegram Bot] ✅ Группа ${chatTitle} (${telegramGroupId}) привязана к пользователю ${user.id}`);

        await ctx.reply(
            `✅ Группа "${chatTitle}" успешно привязана к вашему аккаунту!\n\n` +
            `Теперь вы будете получать уведомления о генерации медиа в эту группу.`
        );
    } catch (error) {
        console.error('[Telegram Bot] Ошибка при добавлении бота в группу:', error);
        try {
            await ctx.reply('Произошла ошибка при привязке группы. Попробуйте позже.');
        } catch (replyError) {
            console.error('[Telegram Bot] Ошибка при отправке сообщения об ошибке:', replyError);
        }
    }
});

// важно чтобы бот был админом, чтобы он мог удалять сообщения
addChatComposer.on("msg:new_chat_members", async (ctx) => {
    ctx.deleteMessage().catch(() => {});
});

addChatComposer.on("msg:left_chat_member", async (ctx) => {
    ctx.deleteMessage().catch(() => {});
});
