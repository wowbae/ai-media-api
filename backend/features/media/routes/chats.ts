// Роуты для работы с чатами
import { Router, Request, Response } from "express";
import path from "path";
import { prisma } from "prisma/client";
import { Prisma } from "@prisma/client";
import { deleteFile } from "../file.service";
import { mediaStorageConfig } from "../config";
import type { CreateChatRequest, UpdateChatRequest } from "../interfaces";
import { APP_MODES, parseAppMode } from "../app-mode";
import { prismaWhereForChatAppMode } from "../prisma-app-mode-where";
import { getCachedChat, setCachedChat, invalidateChatCache } from "./cache";
import { AuthService } from "../../auth/auth.service";
import { authConfig } from "../../../config";

function resolveUserFromAuthHeader(req: Request): { userId: number } | null {
    if (authConfig.disableAuth) {
        return { userId: authConfig.mockUserId };
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) return null;
    const token = authHeader.split(" ")[1];
    if (!token) return null;
    try {
        const payload = AuthService.verifyToken(token);
        return { userId: payload.userId };
    } catch {
        return null;
    }
}

export function createChatsRouter(): Router {
    const router = Router();

    // Получить все чаты
    router.get("/chats", async (req: Request, res: Response) => {
        try {
            const appMode = parseAppMode(req.query.appMode);
            // Загружаем чаты только с подсчетом запросов (без загрузки самих requests)
            const chats = await prisma.mediaChat.findMany({
                where: prismaWhereForChatAppMode(appMode),
                orderBy: { updatedAt: "desc" },
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
            console.error("Ошибка получения чатов:", error);
            res.status(500).json({
                success: false,
                error: "Ошибка получения чатов",
            });
        }
    });

    // Получить чат по ID с запросами
    router.get("/chats/:id", async (req: Request, res: Response) => {
        try {
            const chatId = parseInt(req.params.id);
            const appMode = parseAppMode(req.query.appMode);
            if (isNaN(chatId)) {
                return res
                    .status(400)
                    .json({ success: false, error: "Некорректный ID чата" });
            }

            // Параметр limit для ограничения количества загружаемых запросов (по умолчанию 3 для быстрой загрузки)
            const limit = req.query.limit
                ? parseInt(req.query.limit as string)
                : undefined;
            if (limit !== undefined && (isNaN(limit) || limit < 1)) {
                return res.status(400).json({
                    success: false,
                    error: "Некорректный параметр limit",
                });
            }

            // ВАЖНО: includeInputFiles теперь всегда включены (для превью прикрепленных файлов)
            // Параметр оставлен для обратной совместимости, но игнорируется
            const includeInputFiles = req.query.includeInputFiles === "true";

            console.log(
                `[API] 🔍 Начало запроса /chats/${chatId} (limit=${limit || "none"}, inputFiles всегда включены)`,
            );
            const startTime = Date.now();

            // Проверяем кеш (inputFiles теперь всегда включены в кеш)
            const cachedChat = getCachedChat(chatId, limit);
            if (cachedChat) {
                const totalTime = Date.now() - startTime;
                console.log(
                    `[API] ✅ /chats/${chatId}: из КЕША, время=${totalTime}ms`,
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
                        orderBy: { createdAt: "desc" },
                        ...(limit ? { take: limit } : {}), // Применяем limit только если указан
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
                    .json({ success: false, error: "Чат не найден" });
            }

            const chatMode =
                (chat.settings as { appMode?: string })?.appMode ===
                APP_MODES.AI_MODEL
                    ? APP_MODES.AI_MODEL
                    : APP_MODES.DEFAULT;

            if (chatMode !== appMode) {
                return res
                    .status(404)
                    .json({ success: false, error: "Чат не найден" });
            }

            // Логируем информацию о файлах для отладки
            const totalFiles = chat.requests.reduce(
                (sum, req) => sum + req.files.length,
                0,
            );
            const loadedRequests = chat.requests.length;
            const totalRequests = chat._count.requests;

            const processingTime = Date.now() - startTime - prismaTime;
            const totalTime = Date.now() - startTime;

            console.log(
                `[API] ✅ /chats/${chatId}: загружено запросов=${loadedRequests}${limit ? ` (limit=${limit})` : ""}, всего=${totalRequests}, файлов=${totalFiles}`,
            );
            console.log(
                `[API] ⏱️  Breakdown: DB=${prismaTime}ms, Processing=${processingTime}ms, Total=${totalTime}ms`,
            );

            // Предупреждение если запрос очень медленный
            if (totalTime > 5000) {
                console.warn(
                    `[API] ⚠️  SLOW QUERY DETECTED: ${totalTime}ms for chat ${chatId} with ${loadedRequests} requests and ${totalFiles} files`,
                );
            }

            // Сохраняем в кеш (inputFiles теперь всегда включены)
            setCachedChat(chatId, chat, limit);

            res.json({ success: true, data: chat });
        } catch (error) {
            console.error("Ошибка получения чата:", error);
            res.status(500).json({
                success: false,
                error: "Ошибка получения чата",
            });
        }
    });

    // Создать новый чат
    router.post("/chats", async (req: Request, res: Response) => {
        try {
            const {
                name,
                model,
                settings,
                appMode: appModeRaw,
            } = req.body as CreateChatRequest & { appMode?: string };
            const appMode = parseAppMode(appModeRaw);
            const user = resolveUserFromAuthHeader(req);

            if (appMode !== APP_MODES.AI_MODEL && !user) {
                return res
                    .status(401)
                    .json({ success: false, error: "Unauthorized" });
            }

            if (!name || name.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    error: "Название чата обязательно",
                });
            }

            const chat = await prisma.mediaChat.create({
                data: {
                    userId: user?.userId, // ← Сохраняем userId
                    name: name.trim(),
                    model: model || "NANO_BANANA_PRO_KIEAI",
                    settings: {
                        ...(settings || {}),
                        appMode,
                    } as Prisma.InputJsonValue,
                },
            });

            res.status(201).json({ success: true, data: chat });
        } catch (error) {
            console.error("Ошибка создания чата:", error);
            res.status(500).json({
                success: false,
                error: "Ошибка создания чата",
            });
        }
    });

    // Обновить чат
    router.patch("/chats/:id", async (req: Request, res: Response) => {
        try {
            const chatId = parseInt(req.params.id);
            if (isNaN(chatId)) {
                return res
                    .status(400)
                    .json({ success: false, error: "Некорректный ID чата" });
            }

            const { name, model, settings } = req.body as UpdateChatRequest;

            // Проверяем существование чата
            const existingChat = await prisma.mediaChat.findUnique({
                where: { id: chatId },
            });

            if (!existingChat) {
                return res
                    .status(404)
                    .json({ success: false, error: "Чат не найден" });
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
            console.error("Ошибка обновления чата:", error);

            // Обработка ошибок Prisma
            if (error && typeof error === "object" && "code" in error) {
                const prismaError = error as {
                    code: string;
                    meta?: { target?: string[] };
                };

                // Ошибка невалидного значения enum
                if (prismaError.code === "P2007") {
                    return res.status(400).json({
                        success: false,
                        error: `Недопустимая модель. Проверьте, что база данных синхронизирована со схемой Prisma. Выполните: bunx prisma db push`,
                    });
                }

                // Ошибка записи не найдена
                if (prismaError.code === "P2025") {
                    return res.status(404).json({
                        success: false,
                        error: "Чат не найден",
                    });
                }
            }

            const errorMessage =
                error instanceof Error
                    ? error.message
                    : "Ошибка обновления чата";
            res.status(500).json({ success: false, error: errorMessage });
        }
    });

    // Удалить чат
    router.delete("/chats/:id", async (req: Request, res: Response) => {
        const idParam = req.params.id;
        const chatId = parseInt(idParam);

        try {
            if (isNaN(chatId)) {
                return res
                    .status(400)
                    .json({ success: false, error: "Некорректный ID чата" });
            }

            console.log(`[API] 🗑️ Запрос на удаление чата: ${chatId}`);

            // 1. Сначала находим информацию о файлах для удаления с диска
            // (Делаем это до удаления из БД, чтобы пути были доступны)
            const requests = await prisma.mediaRequest.findMany({
                where: { chatId },
                include: { files: true },
            });

            // 2. Выполняем удаление всех записей в БД в одной транзакции
            await prisma.$transaction(async (tx) => {
                // Удаляем файлы через связь с запросом
                await tx.mediaFile.deleteMany({
                    where: {
                        request: {
                            chatId: chatId,
                        },
                    },
                });

                // Удаляем все запросы чата
                await tx.mediaRequest.deleteMany({
                    where: { chatId: chatId },
                });

                // В конце удаляем сам чат
                await tx.mediaChat.delete({
                    where: { id: chatId },
                });
            });

            console.log(
                `[API] ✅ Чат ${chatId} и все связанные данные удалены из БД`,
            );

            // 3. Удаляем физические файлы асинхронно
            // (Не блокируем ответ пользователю, так как в БД всё уже удалено)
            (async () => {
                let filesCount = 0;
                for (const request of requests) {
                    for (const file of request.files) {
                        filesCount++;
                        if (!file.path) continue;

                        const absolutePath = path.isAbsolute(file.path)
                            ? file.path
                            : path.join(mediaStorageConfig.basePath, file.path);

                        const absolutePreviewPath = file.previewPath
                            ? path.isAbsolute(file.previewPath)
                                ? file.previewPath
                                : path.join(
                                      mediaStorageConfig.basePath,
                                      file.previewPath,
                                  )
                            : null;

                        try {
                            await deleteFile(absolutePath, absolutePreviewPath);
                        } catch (err) {
                            // Игнорируем ошибки удаления файлов с диска
                        }
                    }
                }
                if (filesCount > 0) {
                    console.log(
                        `[API] 🗑️ Удалено физических файлов: ${filesCount} для чата ${chatId}`,
                    );
                }
            })().catch((err) =>
                console.error("[API] Ошибка при удалении файлов с диска:", err),
            );

            // Инвалидируем кеш
            invalidateChatCache(chatId);

            res.json({
                success: true,
                message: "Чат успешно удален",
                data: { id: chatId },
            });
        } catch (error) {
            console.error(
                `[API] ❌ Ошибка при удалении чата ${chatId}:`,
                error,
            );

            // Если чат уже удален (P2025), возвращаем успех для идемпотентности
            if (
                error &&
                typeof error === "object" &&
                "code" in error &&
                error.code === "P2025"
            ) {
                return res.json({
                    success: true,
                    message: "Чат уже был удален",
                    data: { id: chatId },
                });
            }

            const errorMessage =
                error instanceof Error ? error.message : String(error);
            res.status(500).json({
                success: false,
                error: `Ошибка на сервере: ${errorMessage}`,
            });
        }
    });

    return router;
}
