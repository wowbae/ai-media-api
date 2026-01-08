// получаем инфо о пользователе
// Userbot функционал временно отключен

import { NewMessageEvent } from 'telegram/events';

export async function getUserInfo(ctx: NewMessageEvent) {
    console.warn('getUserInfo: userbot функционал временно отключен');
    return null;
}

