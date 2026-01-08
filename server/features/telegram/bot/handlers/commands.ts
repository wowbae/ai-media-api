import { Composer } from 'grammy';

export const commandsComposer = new Composer();

// начало работы с ботом
commandsComposer.command('start', async (ctx) => {
    ctx.reply('Добро пожаловать в AI Media Generator бота!');
});
