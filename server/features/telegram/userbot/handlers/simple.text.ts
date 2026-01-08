import { UserbotService } from 'server/features/telegram/userbot/init';
import { handleCommands } from './commands';
import { handleTriggers, triggers, type TriggerKeys } from './triggers';
import { aiChat } from 'server/features/ai/chat';
import { startTypingAction } from '../service/chat.action';


export function handleSimpleText(telegram: UserbotService) {
    telegram.onNewMessage(async (ctx) => {
        const chatId = ctx.message.chatId?.toString() || '';
        const text = ctx.message.text;
        const isCommand = text.startsWith('/');
        const trigger = Object.keys(triggers).find((key) =>
            triggers[key].includes(text)
        ) as TriggerKeys;

        console.log(`userbot handle simple text from ${chatId}`);

        if (!ctx.isPrivate) {
            // читаем только в личке, группы дают ошибку
            return;
        }

        if (isCommand) {
            handleCommands(ctx);
            return;
        }
        if (trigger) {
            handleTriggers(ctx, trigger);
            return;
        }

        // имитация печати
        await startTypingAction({
            bot: telegram.getClient()!,
            peer: ctx._chatPeer,
            typingMs: 2900,
        });
        // отправляем в чат с гпт, без ассистента
        const response = await aiChat(chatId, text);
        await ctx.message.reply({ message: response });
    });
}
