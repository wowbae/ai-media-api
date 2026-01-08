import { NewMessageEvent } from 'telegram/events';
import { prisma } from 'prisma/client';

export const triggers = {
    hello: ['hi', 'hello'],
    goodbye: ['bye', 'goodbye'],
    test: ['test', 'f', 'а'],
} as const;

// Тип для ключей объекта triggers
export type TriggerKeys = keyof typeof triggers;

export async function handleTriggers(
    ctx: NewMessageEvent,
    trigger: TriggerKeys
) {
    const chatId = ctx.message.chatId?.toString() || '';

    console.log(`handle trigger ${trigger} from ${chatId}`);

    switch (trigger as TriggerKeys) {
        case 'hello':
            ctx.message.reply({ message: 'Hello, world! Its trigger hello' });
            break;

        case 'goodbye':
            ctx.message.reply({
                message: 'Goodbye, world! Its trigger goodbye',
            });
            break;

        case 'test':
            console.log('test trigger');
            const users = await prisma.user.findMany();
            console.log('users', users);

            break;

        default:
            ctx.message.reply({ message: 'Unknown trigger' });
            break;
    }
}
