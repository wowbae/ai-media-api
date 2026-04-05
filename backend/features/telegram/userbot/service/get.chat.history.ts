// Получение истории чата из Telegram
// Userbot функционал временно отключен

export interface TelegramHistoryMessage {
    senderId: string;
    message: string;
}

export async function getChatHistoryFromTelegram(
    _chatId: string,
    _accessHash: number = 0
): Promise<{ messages: TelegramHistoryMessage[] }> {
    console.warn('getChatHistoryFromTelegram: userbot функционал временно отключен');
    return { messages: [] };
}
