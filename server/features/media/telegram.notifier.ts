// Сервис отправки уведомлений в Telegram группу
import { MediaFile } from '@prisma/client';
import { telegramConfig, mediaStorageConfig } from './config';
import { InputFile, Bot } from 'grammy';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import path from 'path';
import { prisma } from 'prisma/client';
import { deleteFile as deleteLocalFile } from './file.service';

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
async function validateChatAccess(
    bot: Bot,
    chatId: string | number
): Promise<boolean> {
    try {
        const chat = await bot.api.getChat(chatId);
        console.log(
            `[Telegram] ✅ Чат доступен: ${chat.title || chat.username || chatId} (тип: ${chat.type})`
        );

        // Проверяем, что бот может отправлять сообщения
        // Для супергрупп и каналов проверяем права администратора
        if (chat.type === 'supergroup' || chat.type === 'group') {
            try {
                const member = await bot.api.getChatMember(
                    chatId,
                    (await bot.api.getMe()).id
                );
                if (member.status === 'left' || member.status === 'kicked') {
                    console.error(
                        `[Telegram] ❌ Бот не является участником группы или был удален`
                    );
                    return false;
                }
                console.log(
                    `[Telegram] ✅ Бот является участником группы (статус: ${member.status})`
                );
            } catch (memberError: unknown) {
                const error = memberError as {
                    error_code?: number;
                    description?: string;
                };
                if (error.error_code === 400) {
                    console.error(
                        `[Telegram] ❌ Бот не может получить информацию о членстве в группе`
                    );
                    return false;
                }
                // Для других ошибок просто логируем, но продолжаем попытку отправки
                console.warn(
                    `[Telegram] ⚠️ Не удалось проверить членство бота:`,
                    error.description || memberError
                );
            }
        }

        return true;
    } catch (error: unknown) {
        const telegramError = error as {
            error_code?: number;
            description?: string;
        };

        if (telegramError.error_code === 400) {
            console.error(`[Telegram] ❌ Чат не найден (chat_id: ${chatId})`);
            console.error(`[Telegram] Возможные причины:`);
            console.error(`[Telegram]  1. Бот не добавлен в группу`);
            console.error(
                `[Telegram]  2. Неправильный chat_id в TELEGRAM_MEDIA_GROUP_ID`
            );
            console.error(
                `[Telegram]  3. Группа была удалена или не существует`
            );
            return false;
        }

        if (telegramError.error_code === 403) {
            console.error(
                `[Telegram] ❌ Нет доступа к чату (chat_id: ${chatId})`
            );
            console.error(
                `[Telegram] Бот был заблокирован или не имеет прав на отправку сообщений`
            );
            return false;
        }

        // Для других ошибок логируем, но продолжаем попытку отправки
        console.warn(
            `[Telegram] ⚠️ Не удалось проверить доступность чата:`,
            telegramError.description || error
        );
        return true; // Разрешаем попытку отправки, возможно чат доступен, но проверка не удалась
    }
}

// Отправка нескольких медиа-файлов группой в Telegram
export async function notifyTelegramGroupBatch(
    files: MediaFile[],
    chatName: string,
    prompt: string
): Promise<boolean> {
    const rawGroupId = telegramConfig.notificationGroupId;

    console.log(
        `[Telegram] notifyTelegramGroupBatch вызвана для ${files.length} файлов`
    );
    console.log(
        `[Telegram] TELEGRAM_MEDIA_GROUP_ID: ${rawGroupId ? 'установлен' : 'НЕ установлен'}`
    );

    if (!rawGroupId) {
        console.warn(
            '[Telegram] ⚠️ TELEGRAM_MEDIA_GROUP_ID не установлен, уведомление не отправлено'
        );
        return false;
    }

    if (files.length === 0) {
        console.warn('[Telegram] ⚠️ Нет файлов для отправки');
        return false;
    }

    const bot = await getBot();

    if (!bot) {
        console.warn(
            '[Telegram] ⚠️ Telegram bot не инициализирован - уведомление не отправлено'
        );
        return false;
    }

    // Нормализуем chat_id
    const groupId = normalizeChatId(rawGroupId);
    console.log(
        `[Telegram] Бот инициализирован, отправка в группу: ${groupId} (тип: ${typeof groupId})`
    );

    // Проверяем доступность чата перед отправкой
    const hasAccess = await validateChatAccess(bot, groupId);
    if (!hasAccess) {
        console.error(`[Telegram] ❌ Нет доступа к чату, отправка отменена`);
        return false;
    }

    try {
        // Формируем caption для первого файла
        const firstFile = files[0];
        const caption = formatCaption(firstFile, chatName, prompt);

        // Подготавливаем массив медиа для отправки группой
        const mediaGroup: Array<{
            type: 'photo' | 'document';
            media: string | InputFile;
            caption?: string;
        }> = [];

        // Telegram позволяет максимум 10 файлов в media group
        const filesToSend = files.slice(0, 10);

        for (let i = 0; i < filesToSend.length; i++) {
            const file = filesToSend[i];
            const absolutePath = path.join(
                process.cwd(),
                mediaStorageConfig.basePath,
                file.path
            );

            if (!existsSync(absolutePath)) {
                console.error(`[Telegram] ❌ Файл не найден: ${absolutePath}`);
                continue;
            }

            const fileBuffer = await readFile(absolutePath);
            const inputFile = new InputFile(fileBuffer, file.filename);

            // Для изображений используем тип 'photo', для остального 'document'
            const mediaType = file.type === 'IMAGE' ? 'photo' : 'document';

            mediaGroup.push({
                type: mediaType,
                media: inputFile,
                // Caption только для первого файла
                caption: i === 0 ? caption : undefined,
            });
        }

        if (mediaGroup.length === 0) {
            console.error('[Telegram] ❌ Нет доступных файлов для отправки');
            return false;
        }

        // Если только один файл, отправляем как обычное сообщение с кнопкой удаления
        if (mediaGroup.length === 1) {
            const firstFile = files[0];
            const absolutePath = path.join(
                process.cwd(),
                mediaStorageConfig.basePath,
                firstFile.path
            );
            const fileBuffer = await readFile(absolutePath);
            const inputFile = new InputFile(fileBuffer, firstFile.filename);

            const deleteButton = {
                text: '🗑️ Удалить',
                callback_data: `delete_file:${firstFile.id}`,
            };

            if (firstFile.type === 'IMAGE') {
                await bot.api.sendPhoto(groupId, inputFile, {
                    caption,
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [[deleteButton]],
                    },
                });
            } else if (firstFile.type === 'VIDEO') {
                await bot.api.sendVideo(groupId, inputFile, {
                    caption,
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [[deleteButton]],
                    },
                });
            } else if (firstFile.type === 'AUDIO') {
                await bot.api.sendAudio(groupId, inputFile, {
                    caption,
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [[deleteButton]],
                    },
                });
            } else {
                await bot.api.sendDocument(groupId, inputFile, {
                    caption,
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [[deleteButton]],
                    },
                });
            }

            console.log(
                `[Telegram] ✅ Уведомление отправлено в Telegram: ${firstFile.filename}, группа: ${groupId}`
            );
            return true;
        }

        // Для нескольких файлов отправляем как media group
        // В media group нельзя использовать reply_markup, поэтому отправляем отдельное сообщение с кнопками
        await bot.api.sendMediaGroup(groupId, mediaGroup);

        // Отправляем отдельное сообщение с кнопками удаления для всех файлов
        const deleteButtons = filesToSend.map((file) => ({
            text: `🗑️ ${file.filename.substring(0, 20)}...`,
            callback_data: `delete_file:${file.id}`,
        }));

        // Разбиваем кнопки на строки по 2 кнопки
        const buttonRows: Array<
            Array<{ text: string; callback_data: string }>
        > = [];
        for (let i = 0; i < deleteButtons.length; i += 2) {
            buttonRows.push(deleteButtons.slice(i, i + 2));
        }

        await bot.api.sendMessage(
            groupId,
            `📎 <b>${filesToSend.length} файлов</b>`,
            {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: buttonRows,
                },
            }
        );

        console.log(
            `[Telegram] ✅ Media group отправлен в Telegram: ${filesToSend.length} файлов, группа: ${groupId}`
        );
        return true;
    } catch (error: unknown) {
        const telegramError = error as {
            error_code?: number;
            description?: string;
            message?: string;
        };

        console.error(`[Telegram] ❌ Ошибка отправки media group в Telegram:`);

        if (telegramError.error_code) {
            console.error(
                `[Telegram]   Код ошибки: ${telegramError.error_code}`
            );
            console.error(
                `[Telegram]   Описание: ${telegramError.description || telegramError.message}`
            );

            if (telegramError.error_code === 400) {
                console.error(`[Telegram]   Возможные причины:`);
                console.error(
                    `[Telegram]     - Чат не найден (бот не добавлен в группу)`
                );
                console.error(
                    `[Telegram]     - Неправильный формат media group`
                );
                console.error(`[Telegram]     - Файлы слишком большие`);
            }
        } else {
            console.error(`[Telegram]   Ошибка:`, error);
        }

        return false;
    }
}

// Отправка медиа-файла в Telegram группу (для обратной совместимости)
export async function notifyTelegramGroup(
    file: MediaFile,
    chatName: string,
    prompt: string
): Promise<boolean> {
    return notifyTelegramGroupBatch([file], chatName, prompt);
}

// Форматирование caption для сообщения
function formatCaption(
    file: MediaFile,
    chatName: string,
    prompt: string
): string {
    const truncatedPrompt =
        prompt.length > 500 ? prompt.slice(0, 497) + '...' : prompt;
    const metadata = file.metadata as Record<string, unknown>;

    // let caption = `🎨 <b>AI Media Generated</b>\n\n`;
    let caption = `📁 <b>Чат:</b> ${escapeHtml(chatName)}\n`;
    caption += `📝 <b>Промпт:\n</b> <code>${escapeHtml(truncatedPrompt)}</code>\n\n`;
    // caption += `📊 <b>Тип:</b> ${file.type}\n`;
    // caption += `💾 <b>Размер:</b> ${formatFileSize(file.size)}\n`;

    // Добавляем размеры для изображений
    if (metadata.width && metadata.height) {
        caption += `📐 <b>Разрешение:</b> ${metadata.width}x${metadata.height}\n`;
    }

    // caption += `\n🕐 ${new Date().toLocaleString('ru-RU')}`;

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
        const telegramError = error as {
            error_code?: number;
            description?: string;
        };
        console.error('[Telegram] Ошибка отправки текстового уведомления:', {
            errorCode: telegramError.error_code,
            description: telegramError.description || error,
            chatId: groupId,
        });
        return false;
    }
}

// Удаление файла из БД, Telegram и локально
export async function deleteMediaFileFromTelegram(
    fileId: number,
    chatId: string | number,
    messageId: number
): Promise<boolean> {
    try {
        console.log(`[Telegram] Начало удаления файла ${fileId}`);

        // Получаем файл из БД
        const file = await prisma.mediaFile.findUnique({
            where: { id: fileId },
        });

        if (!file) {
            console.error(`[Telegram] Файл ${fileId} не найден в БД`);
            return false;
        }

        const bot = await getBot();
        if (!bot) {
            console.error('[Telegram] Бот не инициализирован для удаления');
            return false;
        }

        // Удаляем сообщение из Telegram
        try {
            await bot.api.deleteMessage(chatId, messageId);
            console.log(
                `[Telegram] Сообщение ${messageId} удалено из чата ${chatId}`
            );
        } catch (telegramError: unknown) {
            const error = telegramError as {
                error_code?: number;
                description?: string;
            };
            console.warn(
                `[Telegram] Не удалось удалить сообщение ${messageId} из Telegram:`,
                error.description || telegramError
            );
            // Продолжаем удаление, даже если сообщение не удалось удалить
        }

        // Преобразуем относительные пути в абсолютные
        const absolutePath = path.join(
            process.cwd(),
            mediaStorageConfig.basePath,
            file.path
        );
        const absolutePreviewPath = file.previewPath
            ? path.join(
                  process.cwd(),
                  mediaStorageConfig.basePath,
                  file.previewPath
              )
            : null;

        // Удаляем локальные файлы
        await deleteLocalFile(absolutePath, absolutePreviewPath);
        console.log(`[Telegram] Локальные файлы удалены: ${file.path}`);

        // Удаляем запись из БД
        await prisma.mediaFile.delete({
            where: { id: fileId },
        });
        console.log(`[Telegram] Файл ${fileId} удален из БД`);

        return true;
    } catch (error: unknown) {
        console.error(`[Telegram] Ошибка удаления файла ${fileId}:`, error);
        return false;
    }
}
