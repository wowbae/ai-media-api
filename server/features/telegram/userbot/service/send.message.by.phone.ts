import { Api, TelegramClient } from 'telegram';
import { generateRandomBigInt } from 'telegram/Helpers';

export async function sendByPhoneResolve(
    phone: string,
    text: string,
    bot: TelegramClient
) {
    const isAuthorized = await bot.checkAuthorization();
    if (!bot.connected || !isAuthorized) {
        await bot.connect();
    }

    try {
        const resolved = await bot.invoke(
            new Api.contacts.ResolvePhone({ phone })
        );
        // resolved is Api.contacts.ResolvedPeer: contains peer + users/chats
        // In practice, you can pass resolved.peer straight to SendMessage
        const peer = resolved.peer;

        const randomId = generateRandomBigInt();
        await bot.invoke(
            new Api.messages.SendMessage({
                peer,
                message: text,
                randomId,
            })
        );
    } catch (error) {
        console.log('⛔ Не получили контакт для отправки сообщения ', error);
        return;
    }
}
