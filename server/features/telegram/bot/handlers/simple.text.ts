import { aiChat } from 'server/features/ai/chat';
import { Composer } from 'grammy';
import { triggers, type TriggerKeys } from './triggers';

export const textComposer = new Composer();
textComposer.on('message:text', async (ctx, next) => {
    const chatId = ctx.chatId.toString();
    const text = ctx.message.text;
    const isCommand = text.startsWith('/');
    const trigger = Object.keys(triggers).find((key) =>
        triggers[key].includes(ctx.message.text)
    ) as TriggerKeys;

    if (trigger || isCommand || ctx.chat.type !== 'private') {
        // обработает другой и читаем только в личке
        return next();
    }

    console.log(`handle simple text from ${chatId}`);

    // отправляем в чат с гпт, без ассистента
    const response = await aiChat(chatId, text);
    ctx.replyWithChatAction('typing');
    ctx.reply(response);
});
