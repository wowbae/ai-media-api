// Сервис отправки уведомлений в Telegram группу
import { MediaFile } from '@prisma/client';
import { telegramConfig, mediaStorageConfig, MEDIA_MODELS } from './config';
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

// Удаление медиа-файла с сервера после успешной отправки в Telegram
// Для VIDEO: удаляет локальные файлы, сохраняет URL провайдера
// Для IMAGE: удаляет локальные файлы, сохраняет URL на imgbb
async function deleteMediaAfterTelegramSend(file: MediaFile): Promise<void> {
    // Удаляем только файлы с локальным путем (IMAGE и VIDEO)
    if ((file.type !== 'VIDEO' && file.type !== 'IMAGE') || !file.path) {
        return;
    }

    try {
        // Удаляем локальный файл и превью
        const absolutePath = path.join(
            process.cwd(),
            mediaStorageConfig.basePath,
            file.path
        );
        const absolutePreviewPath = file.previewPath
            ? path.join(process.cwd(), mediaStorageConfig.basePath, file.previewPath)
            : undefined;

        await deleteLocalFile(absolutePath, absolutePreviewPath);

        // Обновляем БД: устанавливаем path и previewPath в null, сохраняем url
        // Для VIDEO: url - это URL провайдера
        // Для IMAGE: url - это URL на imgbb
        await prisma.mediaFile.update({
            where: { id: file.id },
            data: {
                path: null,
                previewPath: null,
                // url остается (URL провайдера для VIDEO или URL на imgbb для IMAGE)
            },
        });

        console.log(
            `[Telegram] ✅ ${file.type === 'VIDEO' ? 'Видео' : 'Изображение'} удалено с сервера после отправки: fileId=${file.id}, filename=${file.filename}`
        );
    } catch (error) {
        console.error(
            `[Telegram] ❌ Ошибка удаления ${file.type === 'VIDEO' ? 'видео' : 'изображения'} с сервера (fileId=${file.id}):`,
            error
        );
        // Не прерываем процесс, просто логируем ошибку
    }
}

// Отправка нескольких медиа-файлов группой в Telegram
export async function notifyTelegramGroupBatch(
    files: MediaFile[],
    chatName: string,
    prompt: string
): Promise<boolean> {
    // Determine target groups
    let targetGroupIds: (string | number)[] = [];

    try {
        const firstFile = files[0];

        // Получаем request с userId
        const request = await prisma.mediaRequest.findUnique({
            where: { id: firstFile.requestId },
            select: {
                userId: true
            }
        });

        // Если есть userId, получаем telegramGroup отдельным запросом
        if (request?.userId) {
            const telegramGroup = await prisma.telegramGroup.findUnique({
                where: { userId: request.userId },
                select: {
                    groupId: true
                }
            });

            if (telegramGroup) {
                targetGroupIds = [telegramGroup.groupId];
            } else if (telegramConfig.notificationGroupId) {
                // Fallback to global config (Admin/Legacy)
                targetGroupIds = [telegramConfig.notificationGroupId];
            } else {
                console.warn('[Telegram] ⚠️ No target group found for user or global config');
                return false;
            }
        } else if (telegramConfig.notificationGroupId) {
            // Fallback to global config (Admin/Legacy)
            targetGroupIds = [telegramConfig.notificationGroupId];
        } else {
            console.warn('[Telegram] ⚠️ No target group found for user or global config');
            return false;
        }
    } catch (e) {
        console.error('[Telegram] Error fetching user groups:', e);
        if (telegramConfig.notificationGroupId) {
            targetGroupIds = [telegramConfig.notificationGroupId];
        }
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


    // Iterate over all target groups
    let successCount = 0;

    for (const rawGroupId of targetGroupIds) {
        // Нормализуем chat_id
        const groupId = normalizeChatId(rawGroupId.toString());
        console.log(
            `[Telegram] Бот инициализирован, отправка в группу: ${groupId}`
        );

    // Проверяем доступность чата перед отправкой
    const hasAccess = await validateChatAccess(bot, groupId);
    if (!hasAccess) {
        console.error(`[Telegram] ❌ Нет доступа к чату ${groupId}, skipping`);
        continue;
    }

    try {
        // Формируем caption для первого файла
        const firstFile = files[0];
        const caption = await formatCaption(firstFile, chatName, prompt);

        // Подготавливаем массив медиа для отправки группой
        const mediaGroup: Array<{
            type: 'photo' | 'document';
            media: string | InputFile;
            caption?: string;
            parse_mode?: 'HTML';
        }> = [];

        // Telegram позволяет максимум 10 файлов в media group
        const filesToSend = files.slice(0, 10);

        for (let i = 0; i < filesToSend.length; i++) {
            const file = filesToSend[i];

            let inputFile: InputFile | string;

            if (file.path) {
                const absolutePath = path.join(
                    process.cwd(),
                    mediaStorageConfig.basePath,
                    file.path
                );

                if (!existsSync(absolutePath)) {
                     // Check if URL is available as fallback
                     if (file.url) {
                         inputFile = new InputFile(new URL(file.url), file.filename); // Grammy supports URL via InputFile or string?
                         // Grammy sendPhoto can take string URL. InputFile from URL is also possible.
                         // But InputFile(url) is for downloading by bot server? No, Grammy InputFile accepts Stream, Buffer, File path.
                         // To send by URL, we pass string directly to sendPhoto/sendDocument.
                         // But here we are building `mediaGroup`.
                         // mediaGroup elements take `media: string | InputFile`.
                         // So we can pass `file.url` as string.
                         inputFile = file.url;
                     } else {
                        console.error(`[Telegram] ❌ Файл не найден: ${absolutePath}`);
                        continue;
                     }
                } else {
                    const fileBuffer = await readFile(absolutePath);
                    inputFile = new InputFile(fileBuffer, file.filename);
                }
            } else if (file.url) {
                inputFile = file.url;
            } else {
                 console.error(`[Telegram] ❌ Файл ${file.id} не имеет пути или URL`);
                 continue;
            }

            // Для изображений используем тип 'photo', для остального 'document'
            const mediaType = file.type === 'IMAGE' ? 'photo' : 'document';

            mediaGroup.push({
                type: mediaType,
                media: inputFile,
                // Caption только для первого файла
                caption: i === 0 ? caption : undefined,
                // parse_mode только для элементов с caption
                parse_mode: i === 0 ? 'HTML' : undefined,
            });
        }

        if (mediaGroup.length === 0) {
            console.error('[Telegram] ❌ Нет доступных файлов для отправки');
            return false;
        }

        // Если только один файл, отправляем как обычное сообщение с кнопкой удаления
        if (mediaGroup.length === 1) {
            const firstFile = files[0];

            let inputFile: InputFile | string;

            if (firstFile.path) {
                 const absolutePath = path.join(
                    process.cwd(),
                    mediaStorageConfig.basePath,
                    firstFile.path
                );
                 const fileBuffer = await readFile(absolutePath);
                 inputFile = new InputFile(fileBuffer, firstFile.filename);
            } else if (firstFile.url) {
                 inputFile = firstFile.url;
            } else {
                 console.error(`[Telegram] ❌ Файл ${firstFile.id} не имеет пути или URL`);
                 return false;
            }

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

            // Удаляем медиа-файл с сервера после успешной отправки (IMAGE и VIDEO)
            if (firstFile.type === 'VIDEO' || firstFile.type === 'IMAGE') {
                await deleteMediaAfterTelegramSend(firstFile);
            }

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

        // Удаляем медиа-файлы с сервера после успешной отправки (IMAGE и VIDEO)
        const mediaFiles = filesToSend.filter((file) => file.type === 'VIDEO' || file.type === 'IMAGE');
        for (const mediaFile of mediaFiles) {
            await deleteMediaAfterTelegramSend(mediaFile);
        }

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

        // Continue for other groups if one fails
        console.error(`[Telegram] Failed to send to one group, continuing...`);
    }

    return successCount > 0;
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
async function formatCaption(
    file: MediaFile,
    chatName: string,
    prompt: string
): Promise<string> {
    const truncatedPrompt =
        prompt.length > 500 ? prompt.slice(0, 497) + '...' : prompt;

    // Загружаем модель из связанного запроса
    let modelName: string | null = null;
    try {
        const request = await prisma.mediaRequest.findUnique({
            where: { id: file.requestId },
            select: { model: true },
        });

        if (request?.model) {
            // Получаем читабельное имя модели из конфига
            const modelConfig = MEDIA_MODELS[request.model];
            modelName = modelConfig?.name || request.model;
        }
    } catch (error) {
        console.warn(
            '[Telegram] Не удалось загрузить модель для caption:',
            error
        );
    }

    // let caption = `🎨 <b>AI Media Generated</b>\n\n`;
    let caption = `📁 <b>Чат:</b> ${escapeHtml(chatName)}\n`;
    // Добавляем модель, если она доступна
    if (modelName) {
        caption += `🤖 <b>Модель:</b> ${escapeHtml(modelName)}\n`;
    }
    caption += `📝 <b>Промпт:</b> <blockquote expandable><code>${escapeHtml(truncatedPrompt)}</code></blockquote>\n`;

    // Добавляем размеры для изображений
    if (file.width && file.height) {
        caption += `📐 <b>Разрешение:</b> ${file.width}x${file.height}\n`;
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

        // Получаем файл из БД
        const file = await prisma.mediaFile.findUnique({
            where: { id: fileId },
        });

        // Проверяем, что файл найден в БД
        if (!file) {
            console.error(`[Telegram] Файл ${fileId} не найден в БД`);
            return false;
        }

        // Преобразуем относительные пути в абсолютные
        if (!file.path) {
            console.error(
                `[Telegram] Файл ${fileId} не имеет пути, удаление невозможно`
            );
            return false;
        }

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
