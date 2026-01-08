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

    const callbackData: IMapCallbackDataNewTask | undefined =
        callbackDataNewTaskMap.get(ctx.callbackQuery.data || '');
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
