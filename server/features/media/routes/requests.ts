// Роуты для работы с запросами
import { Router, Request, Response } from 'express';
import { prisma } from 'prisma/client';

export function createRequestsRouter(): Router {
    const router = Router();

    // Получить статус запроса
    router.get('/requests/:id', async (req: Request, res: Response) => {
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
                    costUsd: true,
                    costTokens: true,
                    errorMessage: true,
                    createdAt: true,
                    completedAt: true,
                    seed: true,
                    inputFiles: true, // Нужно для повторения запросов
                    settings: true, // Нужно для повторения запросов с теми же параметрами
                    files: {
                        orderBy: { createdAt: 'asc' },
                        select: {
                            id: true,
                            requestId: true,
                            filename: true,
                            path: true,
                            url: true,
                            previewPath: true,
                            previewUrl: true,
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
    router.get(
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
                            costUsd: true,
                            costTokens: true,
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

    return router;
}
