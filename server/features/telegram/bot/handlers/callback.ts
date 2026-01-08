import { Composer } from 'grammy';
import {
    callbackDataNewTaskMap,
    IMapCallbackDataNewTask,
    projectListMap,
} from '../maps';
import {
    buildKeyboard_NewTask,
    buildKeyboard_ProjectList,
} from '../service/keyboards/build.keyboards';
import { deleteMediaFileFromTelegram } from '../../../media/telegram.notifier';

export enum Actions_NewTask {
    select_project = 'selected_project',
    select_group = 'selected_group',
    set_date = 'selected_date',
    set_repeats = 'selected_repeats',
    finish = 'create_task',
}

export enum Actions_ProjectList {
    select_project = 'select_project',
}

export const callbackComposer = new Composer();
callbackComposer.on('callback_query:data', async (ctx, next) => {
    const telegramId = ctx.from!.id.toString();
    const chatId = ctx.chat?.id;
    const callbackDataString = ctx.callbackQuery.data || '';

    // Обработка удаления файла
    if (callbackDataString.startsWith('delete_file:')) {
        const fileIdStr = callbackDataString.replace('delete_file:', '');
        const fileId = parseInt(fileIdStr, 10);

        if (isNaN(fileId)) {
            await ctx.answerCallbackQuery({
                text: '❌ Ошибка: неверный ID файла',
                show_alert: false,
            });
            return;
        }

        if (!ctx.callbackQuery.message) {
            await ctx.answerCallbackQuery({
                text: '❌ Ошибка: сообщение не найдено',
                show_alert: false,
            });
            return;
        }

        const messageChatId = ctx.callbackQuery.message.chat.id;
        const messageId = ctx.callbackQuery.message.message_id;

        // Отвечаем на callback, чтобы убрать индикатор загрузки
        await ctx.answerCallbackQuery({
            text: '🗑️ Удаление файла...',
            show_alert: false,
        });

        try {
            const success = await deleteMediaFileFromTelegram(
                fileId,
                messageChatId,
                messageId
            );

            if (success) {
                // Сообщение уже удалено из Telegram функцией deleteMediaFileFromTelegram
                console.log(`[Callback] Файл ${fileId} успешно удален`);
            } else {
                // Если удаление не удалось, отправляем уведомление
                try {
                    await ctx.api.sendMessage(
                        messageChatId,
                        '❌ Не удалось удалить файл. Проверьте логи.',
                        { reply_to_message_id: messageId }
                    );
                } catch (sendError) {
                    console.error('[Callback] Ошибка отправки сообщения об ошибке:', sendError);
                }
            }
        } catch (error) {
            console.error(`[Callback] Ошибка при удалении файла ${fileId}:`, error);
            try {
                await ctx.api.sendMessage(
                    messageChatId,
                    '❌ Произошла ошибка при удалении файла.',
                    { reply_to_message_id: messageId }
                );
            } catch (sendError) {
                console.error('[Callback] Ошибка отправки сообщения об ошибке:', sendError);
            }
        }

        return;
    }

    const callbackData: IMapCallbackDataNewTask | undefined =
        callbackDataNewTaskMap.get(callbackDataString);
    if (!callbackData) return next();

    switch (callbackData.action) {
        case Actions_NewTask.select_project:
            // выводим кнопки со списком проектов
            const projects = projectListMap.get(telegramId);
            if (!projects || projects.length === 0) {
                const msg = await ctx.reply('У вас нет проектов в TickTick');
                if (chatId && msg) {
                    setTimeout(async () => {
                        await ctx.api.deleteMessage(chatId, msg.message_id);
                    }, 10000);
                }
                return;
            }

            const keyboard = buildKeyboard_ProjectList(projects);
            await ctx.reply('Выберите проект', {
                reply_markup: keyboard.toFlowed(2),
            });
            break;

        case Actions_NewTask.select_group:
            console.log('select_group', callbackData);
            break;

        case Actions_NewTask.set_date:
            console.log('set_date', callbackData);
            break;

        case Actions_NewTask.set_repeats:
            console.log('set_repeats', callbackData);
            break;

        case Actions_NewTask.finish:
            console.log('finish', callbackData);
            break;
    }
});
