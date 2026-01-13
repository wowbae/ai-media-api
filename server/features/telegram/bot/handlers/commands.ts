import { Composer, Keyboard, InlineKeyboard } from 'grammy';
import { prisma } from 'prisma/client';
import { pendingUserLinks } from './add.chat';

export const commandsComposer = new Composer();

// Временное хранилище для связи request_id -> userId (для обработки выбора чата)
export const chatRequestLinks = new Map<number, number>();

// начало работы с ботом
commandsComposer.command('start', async (ctx) => {
    try {
        const telegramUserId = ctx.from?.id;
        if (!telegramUserId) {
            await ctx.reply('Ошибка: не удалось определить ваш Telegram ID');
            return;
        }

        // Парсим payload из команды: /start id123 -> userId = 123
        // Также обрабатываем /start select_chat_123 для выбора чата
        const payload = ctx.match as string;
        let userId: number | null = null;
        let isSelectChat = false;

        if (payload) {
            // Формат: select_chat_123 для выбора чата
            const selectChatMatch = payload.match(/^select_chat_(\d+)$/i);
            if (selectChatMatch) {
                userId = parseInt(selectChatMatch[1], 10);
                isSelectChat = true;
            } else {
                // Формат: id123 или просто 123
                const match = payload.match(/^id?(\d+)$/i);
                if (match) {
                    userId = parseInt(match[1], 10);
                }
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
            where: { id: userId },
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
                data: { telegramId: telegramUserId.toString() },
            });
        }

        // Если это запрос на выбор чата, показываем кнопку выбора чата
        if (isSelectChat) {
            const requestId = Math.floor(Number(telegramUserId)) & 0x7fffffff;
            chatRequestLinks.set(requestId, userId);

            const keyboard = new Keyboard();
            keyboard.requestChat(
                '📱 Выбрать группу для уведомлений',
                requestId,
                {
                    chat_is_channel: false,
                    chat_is_forum: false,
                    bot_is_member: false,
                }
            );

            await ctx.reply(
                'Нажмите на кнопку ниже, чтобы выбрать Telegram группу из списка ваших чатов:',
                {
                    reply_markup: keyboard,
                }
            );
            return;
        }

        // Обычная привязка - показываем сообщение с URL-кнопкой
        const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME;
        const inlineKeyboard = new InlineKeyboard();
        inlineKeyboard.url(
            '📱 Выбрать группу для уведомлений',
            `https://t.me/${botUsername}?start=select_chat_${userId}`
        );

        await ctx.reply(
            '✅ Ваш аккаунт успешно привязан!\n\n' +
                'Нажмите на кнопку ниже, чтобы выбрать Telegram группу, куда вы хотите получать уведомления о генерации медиа.\n\n' +
                'Бот будет автоматически добавлен в выбранную группу.',
            {
                reply_markup: inlineKeyboard,
            }
        );

        console.log(
            `[Telegram Bot] Пользователь ${userId} привязал Telegram ID ${telegramUserId}`
        );
    } catch (error) {
        console.error('[Telegram Bot] Ошибка в команде /start:', error);
        await ctx.reply(
            'Произошла ошибка. Попробуйте позже или обратитесь в поддержку.'
        );
    }
});

// Обработчик выбора чата через кнопку
commandsComposer.on('message:chat_shared', async (ctx) => {
    try {
        const telegramUserId = ctx.from?.id;
        if (!telegramUserId) {
            return;
        }

        const requestId = ctx.message.chat_shared.request_id;
        if (!requestId) {
            return;
        }

        // Получаем userId из временного хранилища
        const userId = chatRequestLinks.get(requestId);
        if (!userId) {
            console.warn(
                `[Telegram Bot] Не найден userId для request_id ${requestId}`
            );
            return;
        }

        // Удаляем из временного хранилища
        chatRequestLinks.delete(requestId);

        const chatId = ctx.message.chat_shared.chat_id;
        const chatTitle = ctx.message.chat_shared.title;

        // Проверяем существование пользователя
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            await ctx.reply('Ошибка: пользователь не найден');
            return;
        }

        // Обновляем telegramId пользователя если его еще нет
        if (!user.telegramId) {
            await prisma.user.update({
                where: { id: userId },
                data: { telegramId: telegramUserId.toString() },
            });
        }

        // Сохраняем временную связь userId -> telegramUserId (на случай если бот еще не добавлен в группу)
        pendingUserLinks.set(userId, telegramUserId);

        // Создаем или обновляем TelegramGroup
        const group = await prisma.telegramGroup.upsert({
            where: { userId: user.id },
            update: {
                groupId: chatId.toString(),
                title: chatTitle || `Группа ${chatId}`,
            },
            create: {
                userId: user.id,
                groupId: chatId.toString(),
                title: chatTitle || `Группа ${chatId}`,
            },
        });

        console.log(
            `[Telegram Bot] ✅ Группа ${chatTitle || chatId} (${chatId}) привязана к пользователю ${userId} через кнопку выбора`
        );

        await ctx.reply(
            `✅ Группа "${chatTitle || `Группа ${chatId}`}" успешно привязана к вашему аккаунту!\n\n` +
                `Теперь добавьте этого бота в выбранную группу, и вы будете получать уведомления о генерации медиа.`
        );
    } catch (error) {
        console.error(
            '[Telegram Bot] Ошибка при обработке выбора чата:',
            error
        );
        try {
            await ctx.reply(
                'Произошла ошибка при привязке группы. Попробуйте позже.'
            );
        } catch (replyError) {
            console.error(
                '[Telegram Bot] Ошибка при отправке сообщения об ошибке:',
                replyError
            );
        }
    }
});
