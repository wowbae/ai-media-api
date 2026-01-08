import { Api, TelegramClient } from 'telegram';
import { EntityLike } from 'telegram/define';


interface ITypingParams {
    bot: TelegramClient;
    peer: EntityLike | undefined;
    typingMs?: number;
    refreshMs?: number;
}


export async function startTypingAction(params: ITypingParams): Promise<void> {
    const { bot, peer, typingMs = 3000, refreshMs = 4500 } = params;

    const isAuthorized = await bot.checkAuthorization();
    if (!bot.connected || !isAuthorized) {
        await bot.connect();
    }

    // Отправляем действие "печатает" несколько раз, чтобы удерживать статус
    const startedAt = Date.now();
    while (Date.now() - startedAt < typingMs) {
        await bot.invoke(
            new Api.messages.SetTyping({
                peer,
                action: new Api.SendMessageTypingAction(),
            })
        );
        // Telegram сам гасит действие через ~5-6 сек. Обновляем чуть раньше
        await new Promise((resolve) => setTimeout(resolve, refreshMs));
    }

    // Явно отключаем действие (на всякий случай)
    await bot.invoke(
        new Api.messages.SetTyping({
            peer,
            action: new Api.SendMessageCancelAction(),
        })
    );
}
