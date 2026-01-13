// Роуты для генерации медиа
import { Router, Request, Response } from 'express';
import path from 'path';
import { prisma } from 'prisma/client';
import { MediaModel, Prisma } from '@prisma/client';
import { generateMedia } from '../generation.service';
import { copyFile } from '../file.service';
import { mediaStorageConfig } from '../config';
import { notifyTelegramGroup } from '../telegram.notifier';
import { RequestStatus } from '@prisma/client';
import type { GenerateMediaRequest } from '../interfaces';
import { invalidateChatCache } from './cache';
import { authenticate } from '../../auth/routes';
import { TokenService } from '../../tokens/token.service';
import { MEDIA_MODELS } from '../config';

export function createGenerateRouter(): Router {
    const router = Router();

    // Отправить запрос на генерацию
    router.post('/generate', authenticate, async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            if (!user) {
                return res.status(401).json({ success: false, error: 'Unauthorized' });
            }
            const {
                chatId,
                prompt,
                model,
                inputFiles,
                format,
                quality,
                videoQuality,
                duration,
                ar,
                sound,
                outputFormat,
                negativePrompt,
                seed,
                cfgScale,
                tailImageUrl,
                voice,
                stability,
                similarityBoost,
                speed,
                languageCode,
                generationType,
            } = req.body as GenerateMediaRequest;

            console.log('[API] POST /generate - получен запрос:', {
                chatId,
                prompt: prompt?.substring(0, 50),
                model,
                format,
                quality,
                videoQuality,
                duration,
                ar,
                generationType,
                outputFormat,
                negativePrompt: negativePrompt?.substring(0, 50),
                seed,
                cfgScale,
                tailImageUrl: tailImageUrl ? 'provided' : undefined,
                inputFilesCount: inputFiles?.length || 0,
                timestamp: new Date().toISOString(),
            });

            if (!chatId || typeof chatId !== 'number' || isNaN(chatId)) {
                return res.status(400).json({
                    success: false,
                    error: 'chatId обязателен и должен быть числом',
                });
            }

            if (!prompt || prompt.trim().length === 0) {
                return res
                    .status(400)
                    .json({ success: false, error: 'Промпт обязателен' });
            }

            // Проверяем существование чата
            const chat = await prisma.mediaChat.findUnique({
                where: { id: chatId },
            });

            if (!chat) {
                return res
                    .status(404)
                    .json({ success: false, error: 'Чат не найден' });
            }

            // Определяем модель (из запроса или из настроек чата)
            const selectedModel: MediaModel = model || chat.model;

            // Check Balance
            const modelConfig = MEDIA_MODELS[selectedModel];
            const price = modelConfig?.pricing?.output || 0;
            const cost = Math.ceil(price * 100); // Tokens

            if (user && cost > 0) {
                 const balance = await TokenService.getBalance(user.userId);
                 if (balance < cost) {
                     return res.status(402).json({ success: false, error: 'Недостаточно токенов' });
                 }
            }

            // Обрабатываем inputFiles: конвертируем base64 в URL для обратной совместимости
            // По умолчанию файлы уже загружены на imgbb и приходят как URL
            let processedInputFiles: string[] = inputFiles || [];
            if (inputFiles && inputFiles.length > 0) {
                const base64Files = inputFiles.filter(
                    (file) =>
                        file.startsWith('data:image') ||
                        file.startsWith('data:video')
                );

                if (base64Files.length > 0) {
                    console.warn(
                        `[API] ⚠️ DEPRECATED: Обнаружены base64 файлы (${base64Files.length}), конвертируем в URL для обратной совместимости. ` +
                            `Новый клиент должен отправлять файлы уже как URL через imgbb.`
                    );

                    try {
                        const {
                            uploadMultipleToImgbb,
                            isImgbbConfigured,
                        } = await import('../imgbb.service');

                        if (isImgbbConfigured()) {
                            // Загружаем только изображения на imgbb (видео не поддерживаются imgbb)
                            const imageFiles = base64Files.filter((file) =>
                                file.startsWith('data:image')
                            );
                            const videoFiles = base64Files.filter((file) =>
                                file.startsWith('data:video')
                            );

                            if (imageFiles.length > 0) {
                                const urls = await uploadMultipleToImgbb(imageFiles);
                                // Заменяем base64 на URL для изображений
                                let urlIndex = 0;
                                processedInputFiles = inputFiles.map((file) => {
                                    if (file.startsWith('data:image')) {
                                        return (
                                            urls[urlIndex++] || file
                                        ); // Fallback на base64 если загрузка не удалась
                                    }
                                    return file;
                                });
                                console.log(
                                    `[API] ✅ Конвертировано ${urls.length} base64 изображений в URL`
                                );
                            }

                            // Видео остаются как base64 (imgbb их не поддерживает)
                            if (videoFiles.length > 0) {
                                console.log(
                                    `[API] ℹ️ Видео файлы (${videoFiles.length}) остаются как base64 (imgbb их не поддерживает)`
                                );
                            }
                        }
                    } catch (error) {
                        console.error(
                            '[API] ❌ Ошибка конвертации base64 в URL (используем исходные файлы):',
                            error
                        );
                        // Продолжаем с исходными файлами (base64)
                    }
                }
            }

            // Проверяем, нет ли активных запросов с таким же промптом (защита от дубликатов)
            const recentRequest = await prisma.mediaRequest.findFirst({
                where: {
                    chatId,
                    prompt: prompt.trim(),
                    status: {
                        in: ['PENDING', 'PROCESSING'],
                    },
                    createdAt: {
                        gte: new Date(Date.now() - 5000), // последние 5 секунд
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
            });

            if (recentRequest) {
                console.log('[API] ⚠️ Обнаружен дубликат запроса:', {
                    existingRequestId: recentRequest.id,
                    status: recentRequest.status,
                    createdAt: recentRequest.createdAt,
                });
                return res.status(202).json({
                    success: true,
                    data: {
                        requestId: recentRequest.id,
                        status: recentRequest.status,
                        message: 'Запрос уже обрабатывается',
                    },
                });
            }

            // Создаем запрос в БД (сохраняем обработанные inputFiles - URL для изображений, base64 для видео)
            // Сохраняем все параметры запроса в поле settings для возможности повтора
            const requestSettings: Record<string, unknown> = {};
            if (format !== undefined) requestSettings.format = format;
            if (quality !== undefined) requestSettings.quality = quality;
            if (videoQuality !== undefined)
                requestSettings.videoQuality = videoQuality;
            if (duration !== undefined) requestSettings.duration = duration;
            if (ar !== undefined) requestSettings.ar = ar;
            if (generationType !== undefined)
                requestSettings.generationType = generationType;
            if (sound !== undefined) requestSettings.sound = sound;
            if (outputFormat !== undefined)
                requestSettings.outputFormat = outputFormat;
            if (
                negativePrompt !== undefined &&
                negativePrompt.trim() !== ''
            )
                requestSettings.negativePrompt = negativePrompt;
            if (cfgScale !== undefined) requestSettings.cfgScale = cfgScale;
            if (tailImageUrl !== undefined && tailImageUrl.trim() !== '')
                requestSettings.tailImageUrl = tailImageUrl;
            if (voice !== undefined && voice.trim() !== '')
                requestSettings.voice = voice;
            if (stability !== undefined) requestSettings.stability = stability;
            if (similarityBoost !== undefined)
                requestSettings.similarityBoost = similarityBoost;
            if (speed !== undefined) requestSettings.speed = speed;
            if (languageCode !== undefined && languageCode.trim() !== '')
                requestSettings.languageCode = languageCode;

            const mediaRequest = await prisma.mediaRequest.create({
                data: {
                    chatId,
                    prompt: prompt.trim(),
                    model: selectedModel, // Сохраняем модель, использованную для этого запроса
                    inputFiles: processedInputFiles,
                    status: 'PENDING',
                    seed:
                        seed !== undefined &&
                        seed !== null &&
                        String(seed).trim() !== ''
                            ? String(seed)
                            : null,
                    settings: requestSettings as Prisma.InputJsonValue,
                },
            });

            // Deduct tokens
            if (user && cost > 0) {
                 try {
                     await TokenService.deductTokens(user.userId, cost, `Generation: ${selectedModel}`, mediaRequest.id);
                 } catch (e) {
                     console.error('[API] Failed to deduct tokens, but request was created:', e);
                 }
            }

            // Инвалидируем кеш чата (новый запрос создан)
            invalidateChatCache(chatId);

            console.log('[API] ✅ Создан новый запрос на генерацию:', {
                requestId: mediaRequest.id,
                chatId,
                model: selectedModel,
            });

            // Обновляем updatedAt чата
            await prisma.mediaChat.update({
                where: { id: chatId },
                data: { updatedAt: new Date() },
            });

            // Запускаем генерацию асинхронно (передаем обработанные inputFiles - URL для изображений)
            generateMedia(
                mediaRequest.id,
                prompt.trim(),
                selectedModel,
                processedInputFiles,
                format,
                quality,
                videoQuality,
                duration,
                ar,
                generationType,
                sound,
                outputFormat,
                negativePrompt,
                seed,
                cfgScale,
                tailImageUrl,
                voice,
                stability,
                similarityBoost,
                speed,
                languageCode
            ).catch((error) => {
                console.error('Ошибка генерации:', error);
            });

            res.status(202).json({
                success: true,
                data: {
                    requestId: mediaRequest.id,
                    status: mediaRequest.status,
                    message: 'Запрос на генерацию принят',
                },
            });
        } catch (error) {
            console.error('Ошибка создания запроса:', error);
            res.status(500).json({
                success: false,
                error: 'Ошибка создания запроса',
            });
        }
    });

    // Тестовый режим: создать запрос с последним файлом из чата (ЗАГЛУШКА - НЕ вызывает нейронку!)
    // ВАЖНО: Этот эндпоинт НЕ вызывает generateMedia() и НЕ отправляет запросы в API нейронки
    router.post('/generate-test', async (req: Request, res: Response) => {
        try {
            const { chatId, prompt, seed } = req.body as {
                chatId: number;
                prompt: string;
                seed?: string | number;
            };

            console.log(
                '[API] 🧪 POST /generate-test - ТЕСТОВЫЙ РЕЖИМ (заглушка, БЕЗ вызова нейронки):',
                {
                    chatId,
                    prompt: prompt?.substring(0, 50),
                    note: 'Используется последний файл из чата, запрос в API нейронки НЕ отправляется',
                    timestamp: new Date().toISOString(),
                }
            );

            if (!chatId || typeof chatId !== 'number' || isNaN(chatId)) {
                return res.status(400).json({
                    success: false,
                    error: 'chatId обязателен и должен быть числом',
                });
            }

            if (!prompt || prompt.trim().length === 0) {
                return res
                    .status(400)
                    .json({ success: false, error: 'Промпт обязателен' });
            }

            // Проверяем существование чата
            const chat = await prisma.mediaChat.findUnique({
                where: { id: chatId },
            });

            if (!chat) {
                return res
                    .status(404)
                    .json({ success: false, error: 'Чат не найден' });
            }

            // Находим последний файл в чате
            const lastFile = await prisma.mediaFile.findFirst({
                where: {
                    request: {
                        chatId,
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
            });

            if (!lastFile) {
                console.log('[API] 🧪 Тестовый режим: файлов в чате нет');
                return res.status(404).json({
                    success: false,
                    error: 'В чате нет файлов для тестового режима',
                });
            }

            console.log('[API] 🧪 Тестовый режим: найден последний файл:', {
                fileId: lastFile.id,
                filename: lastFile.filename,
                path: lastFile.path,
            });

            // Создаем новый запрос со статусом COMPLETED
            const mediaRequest = await prisma.mediaRequest.create({
                data: {
                    chatId,
                    prompt: prompt.trim(),
                    model: chat.model, // Сохраняем модель чата для тестового режима
                    inputFiles: [],
                    status: 'COMPLETED',
                    completedAt: new Date(),
                    seed:
                        seed !== undefined &&
                        seed !== null &&
                        String(seed).trim() !== ''
                            ? String(seed)
                            : null,
                },
            });

            if (!lastFile.path) {
                return res.status(400).json({
                    success: false,
                    error: 'Последний файл не имеет локального пути и не может быть скопирован',
                });
            }

            // Копируем файл
            const { path: newFilePath, previewPath: newPreviewPath } =
                await copyFile(lastFile.path, lastFile.previewPath);

            // Получаем размер исходного файла
            const { stat } = await import('fs/promises');
            const absolutePath = path.isAbsolute(newFilePath)
                ? newFilePath
                : path.join(mediaStorageConfig.basePath, newFilePath);
            const fileStat = await stat(absolutePath);

            // Создаем новую запись файла
            const newMediaFile = await prisma.mediaFile.create({
                data: {
                    requestId: mediaRequest.id,
                    type: lastFile.type,
                    filename: path.basename(newFilePath),
                    path: newFilePath,
                    previewPath: newPreviewPath,
                    size: fileStat.size,
                    width: lastFile.width,
                    height: lastFile.height,
                },
            });

            // Обновляем updatedAt чата
            await prisma.mediaChat.update({
                where: { id: chatId },
                data: { updatedAt: new Date() },
            });

            // Инвалидируем кеш
            invalidateChatCache(chatId);

            console.log('[API] 🧪 Тестовый режим: запрос создан:', {
                requestId: mediaRequest.id,
                fileId: newMediaFile.id,
                chatId,
            });

            // Возвращаем ответ фронтенду сразу, чтобы файл появился в чате без задержки
            res.status(201).json({
                success: true,
                data: {
                    requestId: mediaRequest.id,
                    status: 'COMPLETED' as RequestStatus,
                    message: 'Тестовый запрос создан',
                },
            });

            // Отправляем уведомление в Telegram асинхронно (не ждем, чтобы не блокировать ответ)
            console.log(
                '[API] 🧪 Тестовый режим: отправка уведомления в Telegram (асинхронно)'
            );
            notifyTelegramGroup(newMediaFile, chat.name, prompt.trim())
                .then((telegramResult) => {
                    console.log(
                        `[API] 🧪 Тестовый режим: Telegram уведомление ${telegramResult ? 'отправлено' : 'не отправлено'}`
                    );
                })
                .catch((telegramError) => {
                    console.error(
                        '[API] 🧪 Тестовый режим: ошибка отправки в Telegram:',
                        telegramError
                    );
                    // Не прерываем выполнение если Telegram не работает
                });
        } catch (error) {
            console.error(
                '[API] 🧪 Тестовый режим: ошибка создания запроса:',
                error
            );
            res.status(500).json({
                success: false,
                error: 'Ошибка создания тестового запроса',
            });
        }
    });

    return router;
}
