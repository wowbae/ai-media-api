// API роуты для работы с медиа-генерацией
import { Router, Request, Response } from 'express';
import path from 'path';
import { prisma } from 'prisma/client';
import { MediaModel, RequestStatus } from '@prisma/client';
import { generateMedia, getAvailableModels } from './openrouter.service';
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
        res.status(500).json({ success: false, error: 'Ошибка получения чатов' });
    }
});

// Получить чат по ID с запросами
mediaRouter.get('/chats/:id', async (req: Request, res: Response) => {
    try {
        const chatId = parseInt(req.params.id);
        // Параметр limit для ограничения количества загружаемых запросов (по умолчанию 3 для быстрой загрузки)
        const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

        const chat = await prisma.mediaChat.findUnique({
            where: { id: chatId },
            include: {
                requests: {
                    orderBy: { createdAt: 'desc' },
                    ...(limit ? { take: limit } : {}), // Применяем limit только если указан
                    include: {
                        files: true,
                    },
                },
                _count: {
                    select: {
                        requests: true, // Общее количество requests для пагинации
                    },
                },
            },
        });

        if (!chat) {
            return res.status(404).json({ success: false, error: 'Чат не найден' });
        }

        // Логируем информацию о файлах для отладки
        const totalFiles = chat.requests.reduce((sum, req) => sum + req.files.length, 0);
        const loadedRequests = chat.requests.length;
        const totalRequests = chat._count.requests;
        console.log(
            `[API] Запрос /chats/${chatId}: чат найден, загружено запросов=${loadedRequests}${limit ? ` (limit=${limit})` : ''}, всего запросов=${totalRequests}, файлов=${totalFiles}`
        );

        res.json({ success: true, data: chat });
    } catch (error) {
        console.error('Ошибка получения чата:', error);
        res.status(500).json({ success: false, error: 'Ошибка получения чата' });
    }
});

// Создать новый чат
mediaRouter.post('/chats', async (req: Request, res: Response) => {
    try {
        const { name, model, settings } = req.body as CreateChatRequest;

        if (!name || name.trim().length === 0) {
            return res.status(400).json({ success: false, error: 'Название чата обязательно' });
        }

        const chat = await prisma.mediaChat.create({
            data: {
                name: name.trim(),
                model: model || 'NANO_BANANA',
                settings: settings || {},
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
        const { name, model, settings } = req.body as UpdateChatRequest;

        // Проверяем существование чата
        const existingChat = await prisma.mediaChat.findUnique({
            where: { id: chatId },
        });

        if (!existingChat) {
            return res.status(404).json({ success: false, error: 'Чат не найден' });
        }

        const chat = await prisma.mediaChat.update({
            where: { id: chatId },
            data: {
                ...(name && { name: name.trim() }),
                ...(model && { model }),
                ...(settings && { settings }),
            },
        });

        res.json({ success: true, data: chat });
    } catch (error) {
        console.error('Ошибка обновления чата:', error);

        // Обработка ошибок Prisma
        if (error && typeof error === 'object' && 'code' in error) {
            const prismaError = error as { code: string; meta?: { target?: string[] } };

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

        const errorMessage = error instanceof Error ? error.message : 'Ошибка обновления чата';
        res.status(500).json({ success: false, error: errorMessage });
    }
});

// Удалить чат
mediaRouter.delete('/chats/:id', async (req: Request, res: Response) => {
    try {
        const chatId = parseInt(req.params.id);

        // Сначала получаем все файлы для удаления
        const requests = await prisma.mediaRequest.findMany({
            where: { chatId },
            include: { files: true },
        });

        // Удаляем физические файлы
        // Преобразуем относительные пути в абсолютные
        for (const request of requests) {
            for (const file of request.files) {
                const absolutePath = path.join(process.cwd(), mediaStorageConfig.basePath, file.path);
                const absolutePreviewPath = file.previewPath
                    ? path.join(process.cwd(), mediaStorageConfig.basePath, file.previewPath)
                    : null;
                await deleteFile(absolutePath, absolutePreviewPath);
            }
        }

        // Удаляем чат (каскадное удаление requests и files)
        await prisma.mediaChat.delete({
            where: { id: chatId },
        });

        res.json({ success: true, message: 'Чат удален' });
    } catch (error) {
        console.error('Ошибка удаления чата:', error);
        res.status(500).json({ success: false, error: 'Ошибка удаления чата' });
    }
});

// ==================== Генерация ====================

// Отправить запрос на генерацию
mediaRouter.post('/generate', async (req: Request, res: Response) => {
    try {
        const { chatId, prompt, model, inputFiles, format, quality, videoQuality, duration } = req.body as GenerateMediaRequest;

        console.log('[API] POST /generate - получен запрос:', {
            chatId,
            prompt: prompt?.substring(0, 50),
            model,
            format,
            quality,
            videoQuality,
            duration,
            inputFilesCount: inputFiles?.length || 0,
            timestamp: new Date().toISOString(),
        });

        if (!chatId) {
            return res.status(400).json({ success: false, error: 'chatId обязателен' });
        }

        if (!prompt || prompt.trim().length === 0) {
            return res.status(400).json({ success: false, error: 'Промпт обязателен' });
        }

        // Проверяем существование чата
        const chat = await prisma.mediaChat.findUnique({
            where: { id: chatId },
        });

        if (!chat) {
            return res.status(404).json({ success: false, error: 'Чат не найден' });
        }

        // Определяем модель (из запроса или из настроек чата)
        const selectedModel: MediaModel = model || chat.model;

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

        // Создаем запрос в БД
        const mediaRequest = await prisma.mediaRequest.create({
            data: {
                chatId,
                prompt: prompt.trim(),
                inputFiles: inputFiles || [],
                status: 'PENDING',
            },
        });

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

        // Запускаем генерацию асинхронно
        generateMedia(
            mediaRequest.id,
            prompt.trim(),
            selectedModel,
            inputFiles,
            format,
            quality,
            videoQuality,
            duration
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
        res.status(500).json({ success: false, error: 'Ошибка создания запроса' });
    }
});

// Тестовый режим: создать запрос с последним файлом из чата (ЗАГЛУШКА - НЕ вызывает нейронку!)
// ВАЖНО: Этот эндпоинт НЕ вызывает generateMedia() и НЕ отправляет запросы в API нейронки
mediaRouter.post('/generate-test', async (req: Request, res: Response) => {
    try {
        const { chatId, prompt } = req.body as { chatId: number; prompt: string };

        console.log('[API] 🧪 POST /generate-test - ТЕСТОВЫЙ РЕЖИМ (заглушка, БЕЗ вызова нейронки):', {
            chatId,
            prompt: prompt?.substring(0, 50),
            note: 'Используется последний файл из чата, запрос в API нейронки НЕ отправляется',
            timestamp: new Date().toISOString(),
        });

        if (!chatId) {
            return res.status(400).json({ success: false, error: 'chatId обязателен' });
        }

        if (!prompt || prompt.trim().length === 0) {
            return res.status(400).json({ success: false, error: 'Промпт обязателен' });
        }

        // Проверяем существование чата
        const chat = await prisma.mediaChat.findUnique({
            where: { id: chatId },
        });

        if (!chat) {
            return res.status(404).json({ success: false, error: 'Чат не найден' });
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
                inputFiles: [],
                status: 'COMPLETED',
                completedAt: new Date(),
            },
        });

        // Копируем файл
        const { path: newFilePath, previewPath: newPreviewPath } = await copyFile(
            lastFile.path,
            lastFile.previewPath
        );

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
                metadata: lastFile.metadata as Record<string, unknown>,
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
        console.log('[API] 🧪 Тестовый режим: отправка уведомления в Telegram (асинхронно)');
        notifyTelegramGroup(newMediaFile, chat.name, prompt.trim())
            .then((telegramResult) => {
                console.log(
                    `[API] 🧪 Тестовый режим: Telegram уведомление ${telegramResult ? 'отправлено' : 'не отправлено'}`
                );
            })
            .catch((telegramError) => {
                console.error('[API] 🧪 Тестовый режим: ошибка отправки в Telegram:', telegramError);
                // Не прерываем выполнение если Telegram не работает
            });
    } catch (error) {
        console.error('[API] 🧪 Тестовый режим: ошибка создания запроса:', error);
        res.status(500).json({ success: false, error: 'Ошибка создания тестового запроса' });
    }
});

// ==================== Запросы ====================

// Получить статус запроса
mediaRouter.get('/requests/:id', async (req: Request, res: Response) => {
    try {
        const requestId = parseInt(req.params.id);

        const request = await prisma.mediaRequest.findUnique({
            where: { id: requestId },
            include: {
                files: {
                    orderBy: { createdAt: 'asc' },
                },
            },
        });

        if (!request) {
            return res.status(404).json({ success: false, error: 'Запрос не найден' });
        }

        console.log(`[API] Запрос /requests/${requestId}: статус=${request.status}, файлов=${request.files.length}`);
        if (request.files.length > 0) {
            console.log(`[API] Файлы в запросе:`, request.files.map(f => ({ id: f.id, filename: f.filename, path: f.path })));
        }

        res.json({ success: true, data: request });
    } catch (error) {
        console.error('Ошибка получения запроса:', error);
        res.status(500).json({ success: false, error: 'Ошибка получения запроса' });
    }
});

// Получить все запросы чата
mediaRouter.get('/chats/:chatId/requests', async (req: Request, res: Response) => {
    try {
        const chatId = parseInt(req.params.chatId);
        const { page = 1, limit = 20 } = req.query as unknown as PaginationParams;

        const skip = (page - 1) * limit;

        const [requests, total] = await Promise.all([
            prisma.mediaRequest.findMany({
                where: { chatId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: { files: true },
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
        res.status(500).json({ success: false, error: 'Ошибка получения запросов' });
    }
});

// ==================== Файлы ====================

// Получить все файлы с пагинацией
mediaRouter.get('/files', async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 20 } = req.query as unknown as PaginationParams;
        const skip = (page - 1) * limit;

        const [files, total] = await Promise.all([
            prisma.mediaFile.findMany({
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: {
                    request: {
                        select: {
                            prompt: true,
                            chat: {
                                select: { name: true },
                            },
                        },
                    },
                },
            }),
            prisma.mediaFile.count(),
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
        res.status(500).json({ success: false, error: 'Ошибка получения файлов' });
    }
});

// Удалить файл
mediaRouter.delete('/files/:id', async (req: Request, res: Response) => {
    try {
        const fileId = parseInt(req.params.id);

        const file = await prisma.mediaFile.findUnique({
            where: { id: fileId },
        });

        if (!file) {
            return res.status(404).json({ success: false, error: 'Файл не найден' });
        }

        // Преобразуем относительные пути в абсолютные для удаления
        const absolutePath = path.join(process.cwd(), mediaStorageConfig.basePath, file.path);
        const absolutePreviewPath = file.previewPath
            ? path.join(process.cwd(), mediaStorageConfig.basePath, file.previewPath)
            : null;

        // Удаляем физический файл
        await deleteFile(absolutePath, absolutePreviewPath);

        // Удаляем запись из БД
        await prisma.mediaFile.delete({
            where: { id: fileId },
        });

        res.json({ success: true, message: 'Файл удален' });
    } catch (error) {
        console.error('Ошибка удаления файла:', error);
        res.status(500).json({ success: false, error: 'Ошибка удаления файла' });
    }
});

// ==================== Модели ====================

// Получить доступные модели
mediaRouter.get('/models', (_req: Request, res: Response) => {
    try {
        const models = getAvailableModels();
        res.json({ success: true, data: models });
    } catch (error) {
        console.error('Ошибка получения моделей:', error);
        res.status(500).json({ success: false, error: 'Ошибка получения моделей' });
    }
});

