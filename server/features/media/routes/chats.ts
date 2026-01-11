// Роуты для работы с чатами
import { Router, Request, Response } from 'express';
import path from 'path';
import { prisma } from 'prisma/client';
import { Prisma } from '@prisma/client';
import { deleteFile } from '../file.service';
import { mediaStorageConfig } from '../config';
import type { CreateChatRequest, UpdateChatRequest } from '../interfaces';
import {
    getCachedChat,
    setCachedChat,
    invalidateChatCache,
} from './cache';

export function createChatsRouter(): Router {
    const router = Router();

    // Получить все чаты
    router.get('/chats', async (_req: Request, res: Response) => {
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
    router.get('/chats/:id', async (req: Request, res: Response) => {
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

            // ВАЖНО: includeInputFiles теперь всегда включены (для превью прикрепленных файлов)
            // Параметр оставлен для обратной совместимости, но игнорируется
            const includeInputFiles = req.query.includeInputFiles === 'true';

            console.log(
                `[API] 🔍 Начало запроса /chats/${chatId} (limit=${limit || 'none'}, inputFiles всегда включены)`
            );
            const startTime = Date.now();

            // Проверяем кеш (inputFiles теперь всегда включены в кеш)
            const cachedChat = getCachedChat(chatId, limit);
            if (cachedChat) {
                const totalTime = Date.now() - startTime;
                console.log(
                    `[API] ✅ /chats/${chatId}: из КЕША, время=${totalTime}ms`
                );
                return res.json({ success: true, data: cachedChat });
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
                            inputFiles: true, // ВАЖНО: Всегда включаем для отображения превью
                            seed: true,
                            settings: true, // Параметры запроса для повторения
                            files: {
                                select: {
                                    id: true,
                                    filename: true,
                                    path: true,
                                    previewPath: true,
                                    url: true, // URL на imgbb для изображений
                                    previewUrl: true, // Превью URL на imgbb
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

            // Сохраняем в кеш (inputFiles теперь всегда включены)
            setCachedChat(chatId, chat, limit);

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
    router.post('/chats', async (req: Request, res: Response) => {
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
                    model: model || 'NANO_BANANA_PRO_KIEAI',
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
    router.patch('/chats/:id', async (req: Request, res: Response) => {
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

            // Инвалидируем кеш
            invalidateChatCache(chatId);

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
    router.delete('/chats/:id', async (req: Request, res: Response) => {
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
                    if (!file.path) continue;

                    const absolutePath = path.isAbsolute(file.path)
                        ? file.path
                        : path.join(mediaStorageConfig.basePath, file.path);

                    const absolutePreviewPath = file.previewPath
                        ? path.isAbsolute(file.previewPath)
                            ? file.previewPath
                            : path.join(
                                  mediaStorageConfig.basePath,
                                  file.previewPath
                              )
                        : null;

                    try {
                        await deleteFile(absolutePath, absolutePreviewPath);
                    } catch (error) {
                        console.error(
                            `Ошибка удаления файла ${file.filename}:`,
                            error
                        );
                        // Продолжаем удаление даже если файл не найден
                    }
                }
            }

            // Удаляем чат (каскадное удаление запросов и файлов)
            await prisma.mediaChat.delete({
                where: { id: chatId },
            });

            // Инвалидируем кеш
            invalidateChatCache(chatId);

            res.json({ success: true, message: 'Чат удален' });
        } catch (error) {
            console.error('Ошибка удаления чата:', error);
            res.status(500).json({
                success: false,
                error: 'Ошибка удаления чата',
            });
        }
    });

    return router;
}
