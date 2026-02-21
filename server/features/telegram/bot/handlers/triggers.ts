import { prisma } from 'prisma/client';
import { getBot } from '../bot.service';
import { Composer } from 'grammy';
import { findTriggerKeys } from '../utils/find.trigger.keys';

export const triggers = {
    hello: ['hi', 'hello'],
    goodbye: ['bye', 'goodbye'],
    test: ['test', 'f', 'а'],
} as const;

// Тип для ключей объекта triggers
export type TriggerKeys = keyof typeof triggers;

export const triggerComposer = new Composer();
triggerComposer.on('message:text', async (ctx, next) => {
    for (const key of Object.keys(triggers)) {
        if (ctx.message.text.toLowerCase().includes(triggers[key])) {
            ctx.reply(`Trigger ${key}`);
        }
    }
    const triggerKeys: TriggerKeys[] = findTriggerKeys(
        ctx.message.text,
        triggers
    );

    if (triggerKeys.length === 0) {
        return next();
    }

    for (const triggerKey of triggerKeys) {
        console.log(`handle trigger ${triggerKey}`);

        switch (triggerKey) {
            case 'hello':
                ctx.reply('Hello, world! Its trigger hello');
                break;

            case 'goodbye':
                ctx.reply('Goodbye, world! Its trigger goodbye');
                break;

            case 'test':
                console.log('test trigger');
                const users = await prisma.user.findMany();
                console.log('users', users);
                break;
        }
    }
});
