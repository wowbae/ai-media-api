// Утилиты для работы с Telegram ботом

// Имя бота в Telegram (можно вынести в env или получать через API)
// Формат: без @, например "my_bot" для бота @my_bot
export const TELEGRAM_BOT_USERNAME = process.env.VITE_TELEGRAM_BOT_USERNAME || 'your_bot_username';

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
    window.open(link, '_blank', 'noopener,noreferrer');
}
