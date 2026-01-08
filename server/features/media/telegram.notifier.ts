// Сервис отправки уведомлений в Telegram группу
import { MediaFile } from '@prisma/client';
import { telegramConfig, mediaStorageConfig } from './config';
import { InputFile, Bot } from 'grammy';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import path from 'path';

// Бот будет получен лениво при первом использовании
let botInstance: Bot | null = null;
let isInitialized = false;

// Ленивая инициализация бота для отправки уведомлений
async function getBot(): Promise<Bot | null> {
    if (isInitialized) return botInstance;

    isInitialized = true;

    try {
        // Ждем немного, чтобы init.ts успел экспортировать бота
        await new Promise((resolve) => setTimeout(resolve, 100));
        const initModule = await import('../../init');
        botInstance = initModule.bot;
        if (botInstance) {
            console.log('✅ Telegram notifier инициализирован');
        }
    } catch (error) {
        console.warn('⚠️ Telegram bot не доступен для уведомлений');
    }

    return botInstance;
}

// Публичная функция инициализации (для вызова при старте)
export async function initTelegramNotifier(): Promise<void> {
    // Просто триггерим ленивую инициализацию
    await getBot();
}

// Форматирование размера файла
function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Нормализация chat_id - преобразование в число, если это строка с числом
function normalizeChatId(chatId: string): string | number {
    // Если строка начинается с минуса и содержит только цифры (или минус и цифры), преобразуем в число
    const numericMatch = chatId.match(/^(-?\d+)$/);
    if (numericMatch) {
        const num = parseInt(chatId, 10);
        // Telegram API может принимать как строку, так и число, но для групп лучше использовать число
        return num;
    }
    // Для username (@channel) возвращаем как есть
    return chatId;
}

// Проверка доступности чата и прав бота
async function validateChatAccess(bot: Bot, chatId: string | number): Promise<boolean> {
    try {
        const chat = await bot.api.getChat(chatId);
        console.log(`[Telegram] ✅ Чат доступен: ${chat.title || chat.username || chatId} (тип: ${chat.type})`);

        // Проверяем, что бот может отправлять сообщения
        // Для супергрупп и каналов проверяем права администратора
        if (chat.type === 'supergroup' || chat.type === 'group') {
            try {
                const member = await bot.api.getChatMember(chatId, (await bot.api.getMe()).id);
                if (member.status === 'left' || member.status === 'kicked') {
                    console.error(`[Telegram] ❌ Бот не является участником группы или был удален`);
                    return false;
                }
                console.log(`[Telegram] ✅ Бот является участником группы (статус: ${member.status})`);
            } catch (memberError: unknown) {
                const error = memberError as { error_code?: number; description?: string };
                if (error.error_code === 400) {
                    console.error(`[Telegram] ❌ Бот не может получить информацию о членстве в группе`);
                    return false;
                }
                // Для других ошибок просто логируем, но продолжаем попытку отправки
                console.warn(`[Telegram] ⚠️ Не удалось проверить членство бота:`, error.description || memberError);
            }
        }

        return true;
    } catch (error: unknown) {
        const telegramError = error as { error_code?: number; description?: string };

        if (telegramError.error_code === 400) {
            console.error(`[Telegram] ❌ Чат не найден (chat_id: ${chatId})`);
            console.error(`[Telegram] Возможные причины:`);
            console.error(`[Telegram]  1. Бот не добавлен в группу`);
            console.error(`[Telegram]  2. Неправильный chat_id в TELEGRAM_MEDIA_GROUP_ID`);
            console.error(`[Telegram]  3. Группа была удалена или не существует`);
            return false;
        }

        if (telegramError.error_code === 403) {
            console.error(`[Telegram] ❌ Нет доступа к чату (chat_id: ${chatId})`);
            console.error(`[Telegram] Бот был заблокирован или не имеет прав на отправку сообщений`);
            return false;
        }

        // Для других ошибок логируем, но продолжаем попытку отправки
        console.warn(`[Telegram] ⚠️ Не удалось проверить доступность чата:`, telegramError.description || error);
        return true; // Разрешаем попытку отправки, возможно чат доступен, но проверка не удалась
    }
}

// Отправка медиа-файла в Telegram группу
export async function notifyTelegramGroup(
    file: MediaFile,
    chatName: string,
    prompt: string
): Promise<boolean> {
    const rawGroupId = telegramConfig.notificationGroupId;

    console.log(`[Telegram] notifyTelegramGroup вызвана для файла ${file.id}`);
    console.log(`[Telegram] TELEGRAM_MEDIA_GROUP_ID: ${rawGroupId ? 'установлен' : 'НЕ установлен'}`);

    if (!rawGroupId) {
        console.warn('[Telegram] ⚠️ TELEGRAM_MEDIA_GROUP_ID не установлен, уведомление не отправлено');
        return false;
    }

    const bot = await getBot();

    if (!bot) {
        console.warn('[Telegram] ⚠️ Telegram bot не инициализирован - уведомление не отправлено');
        return false;
    }

    // Нормализуем chat_id (преобразуем строку с числом в число)
    const groupId = normalizeChatId(rawGroupId);
    console.log(`[Telegram] Бот инициализирован, отправка в группу: ${groupId} (тип: ${typeof groupId})`);

    // Проверяем доступность чата перед отправкой
    const hasAccess = await validateChatAccess(bot, groupId);
    if (!hasAccess) {
        console.error(`[Telegram] ❌ Нет доступа к чату, отправка отменена для файла ${file.id}`);
        return false;
    }

    try {
        // Формируем caption с информацией
        const caption = formatCaption(file, chatName, prompt);

        // Преобразуем относительный путь в абсолютный
        const absolutePath = path.join(process.cwd(), mediaStorageConfig.basePath, file.path);

        console.log(`[Telegram] Отправка файла: id=${file.id}, filename=${file.filename}`);
        console.log(`[Telegram] Путь файла: ${file.path}`);
        console.log(`[Telegram] Абсолютный путь: ${absolutePath}`);

        // Проверяем существование файла
        if (!existsSync(absolutePath)) {
            console.error(`[Telegram] ❌ Файл не найден: ${absolutePath}`);
            return false;
        }

        console.log(`[Telegram] Файл найден, размер: ${file.size} байт`);

        // Читаем файл
        const fileBuffer = await readFile(absolutePath);
        const inputFile = new InputFile(fileBuffer, file.filename);

        // Отправляем все файлы как документы (без сжатия)
        await bot.api.sendDocument(groupId, inputFile, {
            caption,
            parse_mode: 'HTML',
        });

        console.log(`[Telegram] ✅ Уведомление отправлено в Telegram: ${file.filename}, группа: ${groupId}`);
        return true;
    } catch (error: unknown) {
        const telegramError = error as { error_code?: number; description?: string; message?: string };

        console.error(`[Telegram] ❌ Ошибка отправки в Telegram для файла ${file.id}:`);

        if (telegramError.error_code) {
            console.error(`[Telegram]   Код ошибки: ${telegramError.error_code}`);
            console.error(`[Telegram]   Описание: ${telegramError.description || telegramError.message}`);

            if (telegramError.error_code === 400) {
                console.error(`[Telegram]   Возможные причины:`);
                console.error(`[Telegram]     - Чат не найден (бот не добавлен в группу)`);
                console.error(`[Telegram]     - Неправильный chat_id: ${groupId}`);
                console.error(`[Telegram]     - Файл слишком большой для Telegram`);
            } else if (telegramError.error_code === 403) {
                console.error(`[Telegram]   Бот заблокирован или не имеет прав на отправку сообщений`);
            } else if (telegramError.error_code === 413) {
                console.error(`[Telegram]   Файл слишком большой (максимум 50MB для ботов)`);
            }
        } else {
            console.error(`[Telegram]   Ошибка:`, error);
        }

        return false;
    }
}

// Форматирование caption для сообщения
function formatCaption(file: MediaFile, chatName: string, prompt: string): string {
    const truncatedPrompt = prompt.length > 500 ? prompt.slice(0, 497) + '...' : prompt;
    const metadata = file.metadata as Record<string, unknown>;

    let caption = `🎨 <b>AI Media Generated</b>\n\n`;
    caption += `📁 <b>Чат:</b> ${escapeHtml(chatName)}\n`;
    caption += `📝 <b>Промпт:</b> ${escapeHtml(truncatedPrompt)}\n\n`;
    caption += `📊 <b>Тип:</b> ${file.type}\n`;
    caption += `💾 <b>Размер:</b> ${formatFileSize(file.size)}\n`;

    // Добавляем размеры для изображений
    if (metadata.width && metadata.height) {
        caption += `📐 <b>Разрешение:</b> ${metadata.width}x${metadata.height}\n`;
    }

    caption += `\n🕐 ${new Date().toLocaleString('ru-RU')}`;

    return caption;
}

// Экранирование HTML для Telegram
function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// Отправка текстового уведомления (для ошибок и статусов)
export async function sendTextNotification(message: string): Promise<boolean> {
    const rawGroupId = telegramConfig.notificationGroupId;
    const bot = await getBot();

    if (!rawGroupId || !bot) {
        return false;
    }

    // Нормализуем chat_id
    const groupId = normalizeChatId(rawGroupId);

    try {
        await bot.api.sendMessage(groupId, message, {
            parse_mode: 'HTML',
        });
        return true;
    } catch (error: unknown) {
        const telegramError = error as { error_code?: number; description?: string };
        console.error('[Telegram] Ошибка отправки текстового уведомления:', {
            errorCode: telegramError.error_code,
            description: telegramError.description || error,
            chatId: groupId,
        });
        return false;
    }
}

