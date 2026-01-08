// следим за добавлением в чаты
import { Composer } from 'grammy';

export const addChatComposer = new Composer();

// Обработчик добавления бота в чат (userbot функционал временно отключен)
addChatComposer.on(':new_chat_members:me', async (ctx) => {
    const chatTitle = ctx.chat.title || ctx.chat.id.toString();
    console.log(`Бот добавлен в чат: ${chatTitle}`);
});

// важно чтобы бот был админом, чтобы он мог удалять сообщения
addChatComposer.on("msg:new_chat_members", async (ctx) => {
    ctx.deleteMessage().catch(() => {});
});

addChatComposer.on("msg:left_chat_member", async (ctx) => {
    ctx.deleteMessage().catch(() => {});
});
