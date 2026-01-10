// API роуты для работы с медиа-генерацией
import { Router, Request, Response } from 'express';
import path from 'path';
import { prisma } from 'prisma/client';
import { MediaModel, RequestStatus, Prisma } from '@prisma/client';
import { generateMedia, getAvailableModels } from './generation.service';
import { initMediaStorage, deleteFile, copyFile } from './file.service';
import { initTelegramNotifier, notifyTelegramGroup } from './telegram.notifier';
import { mediaStorageConfig } from './config';
import type {
    GenerateMediaRequest,
    CreateChatRequest,
    UpdateChatRequest,
    PaginationParams,
} from './interfaces';

export const mediaRouter = Router();

// Инициализация при загрузке модуля
initMediaStorage().catch(console.error);

// ==================== In-Memory Cache ====================
// Простой кеш для ускорения запросов к удаленной БД
interface ChatCacheEntry {
    data: any;
    timestamp: number;
    limit?: number;
}

const chatCache = new Map<string, ChatCacheEntry>();
const CACHE_TTL = 30000; // 30 секунд

function getCachedChat(chatId: number, limit?: number): any | null {
    const cacheKey = `${chatId}-${limit || 'all'}`;
    const cached = chatCache.get(cacheKey);

    if (!cached) return null;

    // Проверяем TTL
    if (Date.now() - cached.timestamp > CACHE_TTL) {
        chatCache.delete(cacheKey);
        return null;
    }

    return cached.data;
}

function setCachedChat(chatId: number, data: any, limit?: number): void {
    const cacheKey = `${chatId}-${limit || 'all'}`;
    chatCache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        limit,
    });
}

function invalidateChatCache(chatId: number): void {
    // Удаляем все варианты кеша для этого чата
    const keysToDelete: string[] = [];
    for (const key of chatCache.keys()) {
        if (key.startsWith(`${chatId}-`)) {
            keysToDelete.push(key);
        }
    }
    keysToDelete.forEach((key) => chatCache.delete(key));
    console.log(`[Cache] Invalidated cache for chat ${chatId}`);
}

// Очистка старого кеша каждые 60 секунд
setInterval(() => {
    const now = Date.now();
    let deletedCount = 0;
    for (const [key, entry] of chatCache.entries()) {
        if (now - entry.timestamp > CACHE_TTL) {
            chatCache.delete(key);
            deletedCount++;
        }
    }
    if (deletedCount > 0) {
        console.log(`[Cache] Cleaned up ${deletedCount} expired entries`);
    }
}, 60000);
initTelegramNotifier().catch(console.error);

// ==================== Чаты ====================

// Получить все чаты
mediaRouter.get('/chats', async (_req: Request, res: Response) => {
    try {
        // Загружаем чаты только с подсчетом запросов (без загрузки самих requests)
        const chats = await prisma.mediaChat.findMany({
            orderBy: { updatedAt: 'desc' },
            include: {
                _count: {
                    select: {
                        requests: true,
                    },
                },
            },
        });

        // Подсчитываем файлы для каждого чата одним запросом
        const chatIds = chats.map((chat) => chat.id);
        const filesByChat = new Map<number, number>();

        if (chatIds.length > 0) {
            // Получаем все файлы для этих чатов с их requestId
            const files = await prisma.mediaFile.findMany({
                where: {
                    request: {
                        chatId: { in: chatIds },
                    },
                },
                select: {
                    requestId: true,
                    request: {
                        select: {
                            chatId: true,
                        },
                    },
                },
            });

            // Группируем по chatId
            files.forEach((file) => {
                const chatId = file.request.chatId;
                const current = filesByChat.get(chatId) || 0;
                filesByChat.set(chatId, current + 1);
            });
        }

        // Объединяем данные
        const chatsWithFileCount = chats.map((chat) => ({
            ...chat,
            _count: {
                files: filesByChat.get(chat.id) || 0,
                requests: chat._count.requests,
            },
        }));

        res.json({ success: true, data: chatsWithFileCount });
    } catch (error) {
        console.error('Ошибка получения чатов:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка получения чатов',
        });
    }
});

// Получить чат по ID с запросами
mediaRouter.get('/chats/:id', async (req: Request, res: Response) => {
    try {
        const chatId = parseInt(req.params.id);
        if (isNaN(chatId)) {
            return res
                .status(400)
                .json({ success: false, error: 'Некорректный ID чата' });
        }

        // Параметр limit для ограничения количества загружаемых запросов (по умолчанию 3 для быстрой загрузки)
        const limit = req.query.limit
            ? parseInt(req.query.limit as string)
            : undefined;
        if (limit !== undefined && (isNaN(limit) || limit < 1)) {
            return res
                .status(400)
                .json({ success: false, error: 'Некорректный параметр limit' });
        }

        // Параметр includeInputFiles для загрузки inputFiles (по умолчанию false для экономии трафика)
        const includeInputFiles = req.query.includeInputFiles === 'true';

        console.log(
            `[API] 🔍 Начало запроса /chats/${chatId} (limit=${limit || 'none'}, includeInputFiles=${includeInputFiles})`
        );
        const startTime = Date.now();

        // Проверяем кеш только если не запрашиваем inputFiles (они большие и не критичны для первоначальной загрузки)
        if (!includeInputFiles) {
            const cachedChat = getCachedChat(chatId, limit);
            if (cachedChat) {
                const totalTime = Date.now() - startTime;
                console.log(
                    `[API] ✅ /chats/${chatId}: из КЕША, время=${totalTime}ms`
                );
                return res.json({ success: true, data: cachedChat });
            }
        }

        // Замеряем время отдельных частей запроса
        console.log(`[API] ⏱️  Начало Prisma запроса...`);
        const prismaStartTime = Date.now();

        const chat = await prisma.mediaChat.findUnique({
            where: { id: chatId },
            include: {
                requests: {
                    orderBy: { createdAt: 'desc' },
                    ...(limit ? { take: limit } : {}), // Применяем limit только если указан
                    select: {
                        id: true,
                        chatId: true,
                        prompt: true,
                        status: true,
                        model: true,
                        errorMessage: true,
                        createdAt: true,
                        completedAt: true,
                        ...(includeInputFiles && { inputFiles: true }),
                        files: {
                            select: {
                                id: true,
                                filename: true,
                                path: true,
                                previewPath: true,
                                type: true,
                                size: true,
                                width: true,
                                height: true,
                                createdAt: true,
                                // НЕ загружаем: requestId
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        requests: true, // Общее количество requests для пагинации
                    },
                },
            },
        });

        const prismaTime = Date.now() - prismaStartTime;
        console.log(`[API] ⏱️  Prisma запрос завершен за ${prismaTime}ms`);

        const queryTime = Date.now() - startTime;
        console.log(`[API] ⏱️  Общее время запроса: ${queryTime}ms`);

        if (!chat) {
            return res
                .status(404)
                .json({ success: false, error: 'Чат не найден' });
        }

        // Логируем информацию о файлах для отладки
        const totalFiles = chat.requests.reduce(
            (sum, req) => sum + req.files.length,
            0
        );
        const loadedRequests = chat.requests.length;
        const totalRequests = chat._count.requests;

        const processingTime = Date.now() - startTime - prismaTime;
        const totalTime = Date.now() - startTime;

        console.log(
            `[API] ✅ /chats/${chatId}: загружено запросов=${loadedRequests}${limit ? ` (limit=${limit})` : ''}, всего=${totalRequests}, файлов=${totalFiles}`
        );
        console.log(
            `[API] ⏱️  Breakdown: DB=${prismaTime}ms, Processing=${processingTime}ms, Total=${totalTime}ms`
        );

        // Предупреждение если запрос очень медленный
        if (totalTime > 5000) {
            console.warn(
                `[API] ⚠️  SLOW QUERY DETECTED: ${totalTime}ms for chat ${chatId} with ${loadedRequests} requests and ${totalFiles} files`
            );
        }

        // Сохраняем в кеш только если не запрашивали inputFiles
        if (!includeInputFiles) {
            setCachedChat(chatId, chat, limit);
        }

        res.json({ success: true, data: chat });
    } catch (error) {
        console.error('Ошибка получения чата:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка получения чата',
        });
    }
});

// Создать новый чат
mediaRouter.post('/chats', async (req: Request, res: Response) => {
    try {
        const { name, model, settings } = req.body as CreateChatRequest;

        if (!name || name.trim().length === 0) {
            return res
                .status(400)
                .json({ success: false, error: 'Название чата обязательно' });
        }

        const chat = await prisma.mediaChat.create({
            data: {
                name: name.trim(),
                model: model || 'NANO_BANANA',
                settings: (settings || {}) as Prisma.InputJsonValue,
            },
        });

        res.status(201).json({ success: true, data: chat });
    } catch (error) {
        console.error('Ошибка создания чата:', error);
        res.status(500).json({ success: false, error: 'Ошибка создания чата' });
    }
});

// Обновить чат
mediaRouter.patch('/chats/:id', async (req: Request, res: Response) => {
    try {
        const chatId = parseInt(req.params.id);
        if (isNaN(chatId)) {
            return res
                .status(400)
                .json({ success: false, error: 'Некорректный ID чата' });
        }

        const { name, model, settings } = req.body as UpdateChatRequest;

        // Проверяем существование чата
        const existingChat = await prisma.mediaChat.findUnique({
            where: { id: chatId },
        });

        if (!existingChat) {
            return res
                .status(404)
                .json({ success: false, error: 'Чат не найден' });
        }

        const chat = await prisma.mediaChat.update({
            where: { id: chatId },
            data: {
                ...(name && { name: name.trim() }),
                ...(model && { model }),
                ...(settings && {
                    settings: settings as Prisma.InputJsonValue,
                }),
            },
        });

        res.json({ success: true, data: chat });
    } catch (error) {
        console.error('Ошибка обновления чата:', error);

        // Обработка ошибок Prisma
        if (error && typeof error === 'object' && 'code' in error) {
            const prismaError = error as {
                code: string;
                meta?: { target?: string[] };
            };

            // Ошибка невалидного значения enum
            if (prismaError.code === 'P2007') {
                return res.status(400).json({
                    success: false,
                    error: `Недопустимая модель. Проверьте, что база данных синхронизирована со схемой Prisma. Выполните: bunx prisma db push`,
                });
            }

            // Ошибка записи не найдена
            if (prismaError.code === 'P2025') {
                return res.status(404).json({
                    success: false,
                    error: 'Чат не найден',
                });
            }
        }

        const errorMessage =
            error instanceof Error ? error.message : 'Ошибка обновления чата';
        res.status(500).json({ success: false, error: errorMessage });
    }
});

// Удалить чат
mediaRouter.delete('/chats/:id', async (req: Request, res: Response) => {
    try {
        const chatId = parseInt(req.params.id);
        if (isNaN(chatId)) {
            return res
                .status(400)
                .json({ success: false, error: 'Некорректный ID чата' });
        }

        // Сначала получаем все файлы для удаления
        const requests = await prisma.mediaRequest.findMany({
            where: { chatId },
            include: { files: true },
        });

        // Удаляем физические файлы
        // Преобразуем относительные пути в абсолютные
        for (const request of requests) {
            for (const file of request.files) {
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
                await deleteFile(absolutePath, absolutePreviewPath);
            }
        }

        // Удаляем чат (каскадное удаление requests и files)
        // Инвалидируем кеш перед удалением
        invalidateChatCache(chatId);

        // Удаляем все файлы чата физически
        await prisma.mediaChat.delete({
            where: { id: chatId },
        });

        res.json({ success: true, message: 'Чат удален' });
    } catch (error) {
        console.error('Ошибка удаления чата:', error);
        res.status(500).json({ success: false, error: 'Ошибка удаления чата' });
    }
});

// ==================== Загрузка на imgbb ====================

// Загрузить файлы на imgbb (для inputFiles)
// Принимает массив base64 строк в JSON body
mediaRouter.post('/upload-to-imgbb', async (req: Request, res: Response) => {
    try {
        const { files } = req.body as { files: string[] }; // массив base64 строк

        if (!files || !Array.isArray(files) || files.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Массив файлов (base64) обязателен',
            });
        }

        console.log('[API] POST /upload-to-imgbb - получено файлов:', files.length);

        // Импортируем сервис imgbb
        const { uploadMultipleToImgbb, isImgbbConfigured } = await import('./imgbb.service');

        if (!isImgbbConfigured()) {
            return res.status(500).json({
                success: false,
                error: 'IMGBB_API_KEY не настроен',
            });
        }

        // Загружаем файлы на imgbb
        const urls = await uploadMultipleToImgbb(files);

        console.log('[API] ✅ POST /upload-to-imgbb - успешно загружено:', {
            uploaded: urls.length,
            total: files.length,
        });

        res.json({
            success: true,
            data: {
                urls,
                uploaded: urls.length,
                total: files.length,
            },
        });
    } catch (error) {
        console.error('[API] ❌ Ошибка загрузки на imgbb:', error);
        const errorMessage =
            error instanceof Error ? error.message : 'Ошибка загрузки на imgbb';
        res.status(500).json({
            success: false,
            error: errorMessage,
        });
    }
});

// ==================== Генерация ====================

// Отправить запрос на генерацию
mediaRouter.post('/generate', async (req: Request, res: Response) => {
    try {
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
            outputFormat,
            negativePrompt: negativePrompt?.substring(0, 50),
            seed,
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

        // Обрабатываем inputFiles: конвертируем base64 в URL для обратной совместимости
        // По умолчанию файлы уже загружены на imgbb и приходят как URL
        let processedInputFiles: string[] = inputFiles || [];
        if (inputFiles && inputFiles.length > 0) {
          const base64Files = inputFiles.filter((file) =>
            file.startsWith("data:image") || file.startsWith("data:video")
          );

          if (base64Files.length > 0) {
            console.log(
              `[API] ⚠️ Обнаружены base64 файлы (${base64Files.length}), конвертируем в URL для обратной совместимости...`
            );

            try {
              const { uploadMultipleToImgbb, isImgbbConfigured } = await import(
                "./imgbb.service"
              );

              if (isImgbbConfigured()) {
                // Загружаем только изображения на imgbb (видео не поддерживаются imgbb)
                const imageFiles = base64Files.filter((file) =>
                  file.startsWith("data:image")
                );
                const videoFiles = base64Files.filter((file) =>
                  file.startsWith("data:video")
                );

                if (imageFiles.length > 0) {
                  const urls = await uploadMultipleToImgbb(imageFiles);
                  // Заменяем base64 на URL для изображений
                  let urlIndex = 0;
                  processedInputFiles = inputFiles.map((file) => {
                    if (file.startsWith("data:image")) {
                      return urls[urlIndex++] || file; // Fallback на base64 если загрузка не удалась
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
                "[API] ❌ Ошибка конвертации base64 в URL (используем исходные файлы):",
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
        const mediaRequest = await prisma.mediaRequest.create({
            data: {
                chatId,
                prompt: prompt.trim(),
                model: selectedModel, // Сохраняем модель, использованную для этого запроса
                inputFiles: processedInputFiles,
                status: 'PENDING',
            },
        });

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
            sound,
            outputFormat,
            negativePrompt,
            seed
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
mediaRouter.post('/generate-test', async (req: Request, res: Response) => {
    try {
        const { chatId, prompt } = req.body as {
            chatId: number;
            prompt: string;
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
            },
        });

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

// ==================== Запросы ====================

// Получить статус запроса
mediaRouter.get('/requests/:id', async (req: Request, res: Response) => {
    try {
        const requestId = parseInt(req.params.id);
        if (isNaN(requestId)) {
            return res
                .status(400)
                .json({ success: false, error: 'Некорректный ID запроса' });
        }

        const request = await prisma.mediaRequest.findUnique({
            where: { id: requestId },
            select: {
                id: true,
                chatId: true,
                prompt: true,
                status: true,
                model: true,
                errorMessage: true,
                createdAt: true,
                completedAt: true,
                // Не возвращаем inputFiles, чтобы не тянуть base64
                files: {
                    orderBy: { createdAt: 'asc' },
                    select: {
                        id: true,
                        filename: true,
                        path: true,
                        previewPath: true,
                        type: true,
                        size: true,
                        width: true,
                        height: true,
                        createdAt: true,
                    },
                },
            },
        });

        if (!request) {
            return res
                .status(404)
                .json({ success: false, error: 'Запрос не найден' });
        }

        console.log(
            `[API] Запрос /requests/${requestId}: статус=${request.status}, файлов=${request.files.length}`
        );
        if (request.files.length > 0) {
            console.log(
                `[API] Файлы в запросе:`,
                request.files.map((f) => ({
                    id: f.id,
                    filename: f.filename,
                    path: f.path,
                }))
            );
        }

        res.json({ success: true, data: request });
    } catch (error) {
        console.error('Ошибка получения запроса:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка получения запроса',
        });
    }
});

// Получить все запросы чата
mediaRouter.get(
    '/chats/:chatId/requests',
    async (req: Request, res: Response) => {
        try {
            const chatId = parseInt(req.params.chatId);
            if (isNaN(chatId)) {
                return res
                    .status(400)
                    .json({ success: false, error: 'Некорректный ID чата' });
            }

            const pageParam = req.query.page
                ? parseInt(req.query.page as string)
                : 1;
            const limitParam = req.query.limit
                ? parseInt(req.query.limit as string)
                : 20;

            if (isNaN(pageParam) || pageParam < 1) {
                return res.status(400).json({
                    success: false,
                    error: 'Некорректный параметр page',
                });
            }

            if (isNaN(limitParam) || limitParam < 1 || limitParam > 100) {
                return res.status(400).json({
                    success: false,
                    error: 'Некорректный параметр limit (должен быть от 1 до 100)',
                });
            }

            const page = pageParam;
            const limit = limitParam;
            const skip = (page - 1) * limit;

            const [requests, total] = await Promise.all([
                prisma.mediaRequest.findMany({
                    where: { chatId },
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take: limit,
                    select: {
                        id: true,
                        chatId: true,
                        prompt: true,
                        status: true,
                        model: true,
                        errorMessage: true,
                        createdAt: true,
                        completedAt: true,
                        // Не возвращаем inputFiles, чтобы не тянуть base64
                        files: {
                            select: {
                                id: true,
                                filename: true,
                                path: true,
                                previewPath: true,
                                type: true,
                                size: true,
                                width: true,
                                height: true,
                                createdAt: true,
                            },
                        },
                    },
                }),
                prisma.mediaRequest.count({ where: { chatId } }),
            ]);

            res.json({
                success: true,
                data: requests,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            });
        } catch (error) {
            console.error('Ошибка получения запросов:', error);
            res.status(500).json({
                success: false,
                error: 'Ошибка получения запросов',
            });
        }
    }
);

// ==================== Файлы ====================

// Получить все файлы с пагинацией
mediaRouter.get('/files', async (req: Request, res: Response) => {
    try {
        const pageParam = req.query.page
            ? parseInt(req.query.page as string)
            : 1;
        const limitParam = req.query.limit
            ? parseInt(req.query.limit as string)
            : 20;
        const chatIdParam = req.query.chatId
            ? parseInt(req.query.chatId as string)
            : undefined;

        if (isNaN(pageParam) || pageParam < 1) {
            return res
                .status(400)
                .json({ success: false, error: 'Некорректный параметр page' });
        }

        if (isNaN(limitParam) || limitParam < 1 || limitParam > 100) {
            return res.status(400).json({
                success: false,
                error: 'Некорректный параметр limit (должен быть от 1 до 100)',
            });
        }

        if (chatIdParam !== undefined && isNaN(chatIdParam)) {
            return res.status(400).json({
                success: false,
                error: 'Некорректный параметр chatId',
            });
        }

        const page = pageParam;
        const limit = limitParam;
        const skip = (page - 1) * limit;

        // Формируем условие where для фильтрации по chatId
        const whereCondition = chatIdParam
            ? {
                  request: {
                      chatId: chatIdParam,
                  },
              }
            : {};

        const [files, total] = await Promise.all([
            prisma.mediaFile.findMany({
                where: whereCondition,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                select: {
                    id: true,
                    filename: true,
                    path: true,
                    previewPath: true,
                    type: true,
                    createdAt: true,
                    size: true,
                    width: true,
                    height: true,
                    request: {
                        select: {
                            prompt: true,
                            chat: {
                                select: {
                                    name: true,
                                },
                            },
                        },
                    },
                },
            }),
            prisma.mediaFile.count({
                where: whereCondition,
            }),
        ]);

        res.json({
            success: true,
            data: files,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Ошибка получения файлов:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка получения файлов',
        });
    }
});

// Удалить файл
mediaRouter.delete('/files/:id', async (req: Request, res: Response) => {
    try {
        const fileId = parseInt(req.params.id);
        if (isNaN(fileId)) {
            return res
                .status(400)
                .json({ success: false, error: 'Некорректный ID файла' });
        }

        const file = await prisma.mediaFile.findUnique({
            where: { id: fileId },
        });

        if (!file) {
            return res
                .status(404)
                .json({ success: false, error: 'Файл не найден' });
        }

        // Преобразуем относительные пути в абсолютные для удаления
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

        // Проверяем существование физического файла перед удалением
        const { existsSync } = await import('fs');
        const fileExists = existsSync(absolutePath);

        if (fileExists) {
            // Удаляем физический файл только если он существует
            await deleteFile(absolutePath, absolutePreviewPath);
            console.log(
                `[MediaRoutes] Физический файл удален: ${file.filename}`
            );
        } else {
            console.warn(
                `[MediaRoutes] Физический файл не найден (уже удален?): ${file.filename}`
            );
        }

        // Удаляем запись из БД в любом случае
        await prisma.mediaFile.delete({
            where: { id: fileId },
        });

        // Инвалидируем кеш чата (файл удален)
        if (file.requestId) {
            const request = await prisma.mediaRequest.findUnique({
                where: { id: file.requestId },
                select: { chatId: true },
            });
            if (request) {
                invalidateChatCache(request.chatId);
            }
        }

        res.json({
            success: true,
            message: fileExists
                ? 'Файл удален'
                : 'Запись удалена (физический файл отсутствовал)',
        });
    } catch (error) {
        console.error('Ошибка удаления файла:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка удаления файла',
        });
    }
});

// ==================== Thumbnail ====================

// Сохранить thumbnail для видео (генерируется на клиенте через canvas)
mediaRouter.post(
    '/files/:id/thumbnail',
    async (req: Request, res: Response) => {
        try {
            const fileId = parseInt(req.params.id);
            if (isNaN(fileId)) {
                return res
                    .status(400)
                    .json({ success: false, error: 'Некорректный ID файла' });
            }

            const { thumbnail } = req.body as { thumbnail: string }; // base64 image

            if (!thumbnail) {
                return res
                    .status(400)
                    .json({ success: false, error: 'thumbnail обязателен' });
            }

            // Проверяем существование файла
            const file = await prisma.mediaFile.findUnique({
                where: { id: fileId },
            });

            if (!file) {
                return res
                    .status(404)
                    .json({ success: false, error: 'Файл не найден' });
            }

            // Проверяем, что это видео
            if (file.type !== 'VIDEO') {
                return res.status(400).json({
                    success: false,
                    error: 'Thumbnail можно создать только для видео',
                });
            }

            // Если превью уже существует - не перезаписываем
            if (file.previewPath) {
                return res.json({
                    success: true,
                    data: { previewPath: file.previewPath },
                    message: 'Превью уже существует',
                });
            }

            // Извлекаем base64 данные (убираем data:image/jpeg;base64, prefix)
            const base64Data = thumbnail.replace(
                /^data:image\/\w+;base64,/,
                ''
            );
            const buffer = Buffer.from(base64Data, 'base64');

            // Импортируем sharp для обработки изображения
            let sharp: typeof import('sharp') | null = null;
            try {
                sharp = (await import('sharp')).default;
            } catch {
                console.warn(
                    'Sharp не установлен - превью будет сохранено без обработки'
                );
            }

            // Генерируем имя файла для превью
            const previewFilename = `preview-${file.filename.replace(/\.[^.]+$/, '.jpg')}`;
            const fullPreviewPath = path.join(
                mediaStorageConfig.previewsPath,
                previewFilename
            );

            // Сохраняем превью (с оптимизацией через sharp если доступен)
            if (sharp) {
                const { width, height } = mediaStorageConfig.previewSize;
                await sharp(buffer)
                    .resize(width, height, {
                        fit: 'cover',
                        position: 'center',
                    })
                    .jpeg({ quality: 80 })
                    .toFile(fullPreviewPath);
            } else {
                // Fallback: сохраняем как есть
                const { writeFile } = await import('fs/promises');
                await writeFile(fullPreviewPath, buffer);
            }

            // Формируем относительный путь
            const relativePreviewPath = path.relative(
                mediaStorageConfig.basePath,
                fullPreviewPath
            );

            // Обновляем запись в БД
            await prisma.mediaFile.update({
                where: { id: fileId },
                data: { previewPath: relativePreviewPath },
            });

            console.log(
                `[API] ✅ Thumbnail создан для файла ${fileId}: ${relativePreviewPath}`
            );

            res.json({
                success: true,
                data: { previewPath: relativePreviewPath },
                message: 'Превью успешно создано',
            });
        } catch (error) {
            console.error('Ошибка создания превью:', error);
            res.status(500).json({
                success: false,
                error: 'Ошибка создания превью',
            });
        }
    }
);

// ==================== Модели ====================

// Получить доступные модели
mediaRouter.get('/models', (_req: Request, res: Response) => {
    try {
        const models = getAvailableModels();
        res.json({ success: true, data: models });
    } catch (error) {
        console.error('Ошибка получения моделей:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка получения моделей',
        });
    }
});
