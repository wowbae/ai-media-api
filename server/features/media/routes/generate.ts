// Роуты для генерации медиа
import { Router, Request, Response } from 'express';
import { prisma } from 'prisma/client';
import { Prisma } from '@prisma/client';
import { generateMedia } from '../generation.service';
import { copyFile } from '../file.service';
import { mediaStorageConfig } from '../config';
import { notifyTelegramGroup } from '../telegram.notifier';
import type { GenerateMediaRequest, MediaModel } from '../interfaces';
import { invalidateChatCache } from './cache';
import { authenticate } from '../../auth/routes';
import { TokenService } from '../../tokens/token.service';
import { getModelPricing } from '../pricing';
import { convertBase64FilesToUrls, convertVideoFilesToUrls } from '../file-converter.service';

export function createGenerateRouter(): Router {
    const router = Router();

    /**
     * POST /generate - Создать запрос на генерацию
     * Возвращает requestId для отслеживания статуса через SSE
     */
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
                duration: durationRaw,
                ar,
                sound,
                fixedLens,
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
                originalTaskId,
                inputVideoFiles,
                characterOrientation,
            } = req.body as GenerateMediaRequest;

            // Преобразуем duration в число
            const duration = durationRaw !== undefined && durationRaw !== null
                ? (() => {
                    const num = typeof durationRaw === 'string'
                        ? parseInt(durationRaw, 10)
                        : Number(durationRaw);
                    return !isNaN(num) && isFinite(num) ? num : undefined;
                })()
                : undefined;

            // Валидация
            if (!chatId || typeof chatId !== 'number' || isNaN(chatId)) {
                return res.status(400).json({
                    success: false,
                    error: 'chatId обязателен и должен быть числом',
                });
            }

            if (!prompt || prompt.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Промпт обязателен',
                });
            }

            // Проверяем существование чата
            const chat = await prisma.mediaChat.findUnique({
                where: { id: chatId },
            });

            if (!chat) {
                return res.status(404).json({
                    success: false,
                    error: 'Чат не найден',
                });
            }

            // Определяем модель
            const selectedModel: MediaModel = model || (chat.model as MediaModel);

            // Рассчитываем стоимость
            const pricing = getModelPricing(selectedModel as any);
            const costUsd = pricing?.finalPrice ?? null;
            const costTokens = pricing?.tokens ?? null;

            // Проверяем баланс
            if (user && (costTokens ?? 0) > 0) {
                const balance = await TokenService.getBalance(user.userId);
                if (balance < (costTokens ?? 0)) {
                    return res.status(402).json({
                        success: false,
                        error: 'Недостаточно токенов',
                    });
                }
            }

            // Конвертируем base64 файлы в URL (изображения → imgbb)
            const { processedFiles } = await convertBase64FilesToUrls(inputFiles);
            // Конвертируем видео в публичные URL (base64 → сохраняем на сервер, путь → полный URL)
            const { processedVideoFiles } = await convertVideoFilesToUrls(inputVideoFiles);

            // Проверяем дубликаты запросов
            const recentRequest = await prisma.mediaRequest.findFirst({
                where: {
                    chatId,
                    prompt: prompt.trim(),
                    status: { in: ['PENDING', 'PROCESSING'] },
                    createdAt: { gte: new Date(Date.now() - 5000) },
                },
                orderBy: { createdAt: 'desc' },
            });

            if (recentRequest) {
                console.log('[API] ⚠️ Обнаружен дубликат запроса:', {
                    existingRequestId: recentRequest.id,
                    status: recentRequest.status,
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

            // Сохраняем настройки запроса
            const requestSettings: Record<string, unknown> = {};
            if (format !== undefined) requestSettings.format = format;
            if (quality !== undefined) requestSettings.quality = quality;
            if (videoQuality !== undefined) requestSettings.videoQuality = videoQuality;
            if (duration !== undefined) requestSettings.duration = duration;
            if (ar !== undefined) requestSettings.ar = ar;
            if (generationType !== undefined) requestSettings.generationType = generationType;
            if (sound !== undefined) requestSettings.sound = sound;
            if (fixedLens !== undefined) requestSettings.fixedLens = fixedLens;
            if (outputFormat !== undefined) requestSettings.outputFormat = outputFormat;
            if (negativePrompt !== undefined && negativePrompt.trim() !== '') {
                requestSettings.negativePrompt = negativePrompt;
            }
            if (cfgScale !== undefined) requestSettings.cfgScale = cfgScale;
            if (tailImageUrl !== undefined && tailImageUrl.trim() !== '') {
                requestSettings.tailImageUrl = tailImageUrl;
            }
            if (voice !== undefined && voice.trim() !== '') {
                requestSettings.voice = voice;
            }
            if (stability !== undefined) requestSettings.stability = stability;
            if (similarityBoost !== undefined) requestSettings.similarityBoost = similarityBoost;
            if (speed !== undefined) requestSettings.speed = speed;
            if (languageCode !== undefined && languageCode.trim() !== '') {
                requestSettings.languageCode = languageCode;
            }

            // Создаём запрос в БД
            const mediaRequest = await prisma.mediaRequest.create({
                data: {
                    userId: user?.userId,
                    chatId,
                    prompt: prompt.trim(),
                    model: selectedModel,
                    inputFiles: processedFiles,
                    status: 'PENDING',
                    seed: seed !== undefined && seed !== null && String(seed).trim() !== ''
                        ? String(seed)
                        : null,
                    settings: requestSettings as Prisma.InputJsonValue,
                    costUsd: costUsd !== null ? new Prisma.Decimal(costUsd) : null,
                    costTokens: costTokens ?? null,
                },
            });

            // Списываем токены
            if (user && (costTokens ?? 0) > 0) {
                try {
                    await TokenService.deductTokens(
                        user.userId,
                        costTokens ?? 0,
                        `Generation: ${selectedModel}`,
                        mediaRequest.id
                    );
                } catch (e) {
                    console.error('[API] Failed to deduct tokens:', e);
                }
            }

            // Инвалидируем кеш и обновляем чат
            invalidateChatCache(chatId);
            await prisma.mediaChat.update({
                where: { id: chatId },
                data: { updatedAt: new Date() },
            });

            // Запускаем генерацию асинхронно
            generateMedia({
                requestId: mediaRequest.id,
                prompt: prompt.trim(),
                model: selectedModel,
                inputFiles: processedFiles,
                format,
                quality,
                videoQuality,
                duration,
                ar,
                generationType,
                originalTaskId,
                sound,
                fixedLens,
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
                inputVideoFiles: processedVideoFiles.length > 0 ? processedVideoFiles : undefined,
                characterOrientation,
            }).catch((error) => {
                console.error('[API] Ошибка генерации:', error);
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

    /**
     * POST /generate-test - Тестовый режим (копирование последнего файла из чата)
     * НЕ вызывает нейронку, используется для тестирования
     */
    router.post('/generate-test', async (req: Request, res: Response) => {
        try {
            const { chatId, prompt, seed } = req.body as {
                chatId: number;
                prompt: string;
                seed?: string | number;
            };

            console.log('[API] 🧪 POST /generate-test - ТЕСТОВЫЙ РЕЖИМ:', {
                chatId,
                prompt: prompt?.substring(0, 50),
            });

            if (!chatId || typeof chatId !== 'number' || isNaN(chatId)) {
                return res.status(400).json({
                    success: false,
                    error: 'chatId обязателен и должен быть числом',
                });
            }

            if (!prompt || prompt.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Промпт обязателен',
                });
            }

            const chat = await prisma.mediaChat.findUnique({
                where: { id: chatId },
            });

            if (!chat) {
                return res.status(404).json({
                    success: false,
                    error: 'Чат не найден',
                });
            }

            // Находим последний файл в чате
            const lastFile = await prisma.mediaFile.findFirst({
                where: {
                    request: { chatId },
                },
                orderBy: { createdAt: 'desc' },
            });

            if (!lastFile) {
                return res.status(404).json({
                    success: false,
                    error: 'В чате нет файлов для тестового режима',
                });
            }

            // Создаём запрос со статусом COMPLETED
            const mediaRequest = await prisma.mediaRequest.create({
                data: {
                    userId: chat.userId,
                    chatId,
                    prompt: prompt.trim(),
                    model: chat.model,
                    inputFiles: [],
                    status: 'COMPLETED',
                    completedAt: new Date(),
                    seed: seed !== undefined && seed !== null && String(seed).trim() !== ''
                        ? String(seed)
                        : null,
                },
            });

            if (!lastFile.path) {
                return res.status(400).json({
                    success: false,
                    error: 'Последний файл не имеет локального пути',
                });
            }

            // Копируем файл
            const { path: newFilePath, previewPath: newPreviewPath } =
                await copyFile(lastFile.path, lastFile.previewPath);

            // Получаем размер файла
            const { stat } = await import('fs/promises');
            const absolutePath = require('path').isAbsolute(newFilePath)
                ? newFilePath
                : require('path').join(mediaStorageConfig.basePath, newFilePath);
            const fileStat = await stat(absolutePath);

            // Создаём запись файла
            const newMediaFile = await prisma.mediaFile.create({
                data: {
                    requestId: mediaRequest.id,
                    type: lastFile.type,
                    filename: require('path').basename(newFilePath),
                    path: newFilePath,
                    previewPath: newPreviewPath,
                    size: fileStat.size,
                    width: lastFile.width,
                    height: lastFile.height,
                },
            });

            // Обновляем чат
            await prisma.mediaChat.update({
                where: { id: chatId },
                data: { updatedAt: new Date() },
            });

            invalidateChatCache(chatId);

            console.log('[API] 🧪 Тестовый режим: запрос создан:', {
                requestId: mediaRequest.id,
                fileId: newMediaFile.id,
            });

            // Возвращаем ответ сразу
            res.status(201).json({
                success: true,
                data: {
                    requestId: mediaRequest.id,
                    status: 'COMPLETED',
                    message: 'Тестовый запрос создан',
                },
            });

            // Отправляем уведомление в Telegram асинхронно
            notifyTelegramGroup(newMediaFile, chat.name, prompt.trim())
                .catch((error) => {
                    console.error('[API] Ошибка отправки в Telegram:', error);
                });
        } catch (error) {
            console.error('[API] Ошибка создания тестового запроса:', error);
            res.status(500).json({
                success: false,
                error: 'Ошибка создания тестового запроса',
            });
        }
    });

    return router;
}
