import { NewMessageEvent } from 'telegram/events';

export async function handleCommands(ctx: NewMessageEvent) {
    const text = ctx.message.text;
    const [command] = text.split(' ');

    switch (command) {
        case '/start':
            ctx.message.reply({ message: 'Добро пожаловать в AI Media Generator!' });
            break;
        default:
            ctx.message.reply({ message: 'Unknown command' });
            break;
    }
}
