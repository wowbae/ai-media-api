// Утилиты для работы с Telegram ботом

// Имя бота в Telegram (можно вынести в env или получать через API)
// Формат: без @, например "my_bot" для бота @my_bot
export const TELEGRAM_BOT_USERNAME =
    import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'your_bot_username';

/**
 * Генерирует deep link для привязки Telegram группы
 * @param userId - ID пользователя из БД
 * @returns URL для перехода в Telegram бот с payload
 */
export function generateTelegramBotLink(userId: number): string {
    const payload = `id${userId}`;
    return `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${payload}`;
}

/**
 * Открывает Telegram бот в новом окне/вкладке
 * @param userId - ID пользователя из БД
 */
export function openTelegramBot(userId: number): void {
    const link = generateTelegramBotLink(userId);
    console.log('Opening Telegram bot link:', link);
    console.log('Bot username:', TELEGRAM_BOT_USERNAME);

    // Пытаемся открыть в новом окне
    try {
        window.open(link, '_blank', 'noopener,noreferrer');
    } catch (error) {
        console.error('Error opening Telegram link:', error);
        // Fallback: открываем в том же окне
        window.location.href = link;
    }
}
