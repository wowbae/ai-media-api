// Роуты для работы с файлами
import { Router, Request, Response } from 'express';
import path from 'path';
import { prisma } from 'prisma/client';
import { deleteFile } from '../file.service';
import { mediaStorageConfig } from '../config';
import { invalidateChatCache } from './cache';

export function createFilesRouter(): Router {
    const router = Router();

    // Получить все файлы с пагинацией
    router.get('/files', async (req: Request, res: Response) => {
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
                        requestId: true,
                        filename: true,
                        path: true,
                        url: true,
                        previewPath: true,
                        previewUrl: true,
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
    router.delete('/files/:id', async (req: Request, res: Response) => {
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
            const absolutePath = file.path
                ? path.join(
                      process.cwd(),
                      mediaStorageConfig.basePath,
                      file.path
                  )
                : null;

            const absolutePreviewPath = file.previewPath
                ? path.join(
                      process.cwd(),
                      mediaStorageConfig.basePath,
                      file.previewPath
                  )
                : null;

            // Проверяем существование физического файла перед удалением
            const { existsSync } = await import('fs');
            const fileExists = absolutePath ? existsSync(absolutePath) : false;

            if (fileExists) {
                // Удаляем физический файл только если он существует
                await deleteFile(absolutePath!, absolutePreviewPath);
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

    // Сохранить thumbnail для видео (генерируется на клиенте через canvas)
    router.post(
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

                // Инвалидируем кеш чата
                if (file.requestId) {
                    const request = await prisma.mediaRequest.findUnique({
                        where: { id: file.requestId },
                        select: { chatId: true },
                    });
                    if (request) {
                        invalidateChatCache(request.chatId);
                    }
                }

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

    // Загрузить файлы на imgbb (для inputFiles)
    // Принимает массив base64 строк в JSON body
    router.post('/upload-to-imgbb', async (req: Request, res: Response) => {
        try {
            const { files } = req.body as { files: string[] }; // массив base64 строк

            if (!files || !Array.isArray(files) || files.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Массив файлов (base64) обязателен',
                });
            }

            console.log(
                '[API] POST /upload-to-imgbb - получено файлов:',
                files.length
            );

            // Импортируем сервис imgbb
            const {
                uploadMultipleToImgbb,
                isImgbbConfigured,
            } = await import('../imgbb.service');

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
                error instanceof Error
                    ? error.message
                    : 'Ошибка загрузки на imgbb';
            res.status(500).json({
                success: false,
                error: errorMessage,
            });
        }
    });

    // Загрузить пользовательские медиа (сохранение в ai-media и БД)
    router.post('/upload-user-media', async (req: Request, res: Response) => {
        try {
            const { chatId, files } = req.body as {
                chatId: number;
                files: { base64: string; mimeType: string; filename: string }[];
            };

            if (!chatId || !files || !Array.isArray(files) || files.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'chatId и массив файлов обязательны',
                });
            }

            console.log(`[API] POST /upload-user-media - chatId: ${chatId}, файлов: ${files.length}`);

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

            // Импортируем сервисы
            const { saveBase64File } = await import('../file.service');
            const { notifyTelegramGroup } = await import('../telegram.notifier');

            // Создаем MediaRequest для этой загрузки
            const filenames = files.map(f => f.filename).join(', ');
            const mediaRequest = await prisma.mediaRequest.create({
                data: {
                    chatId,
                    prompt: `User Upload: ${filenames}`,
                    status: 'COMPLETED',
                    completedAt: new Date(),
                },
            });

            const savedFiles: any[] = [];

            // Сохраняем каждый файл
            for (const fileData of files) {
                try {
                    // Извлекаем чистый base64 если есть префикс data:...;base64,
                    const base64Clean = fileData.base64.replace(/^data:.*?;base64,/, '');

                    const savedFileInfo = await saveBase64File(base64Clean, fileData.mimeType);

                    // Создаем запись в БД
                    const mediaFile = await prisma.mediaFile.create({
                        data: {
                            requestId: mediaRequest.id,
                            type: savedFileInfo.type,
                            filename: fileData.filename || savedFileInfo.filename,
                            path: savedFileInfo.path,
                            url: savedFileInfo.url,
                            previewPath: savedFileInfo.previewPath,
                            previewUrl: savedFileInfo.previewUrl,
                            size: savedFileInfo.size,
                            width: savedFileInfo.width,
                            height: savedFileInfo.height,
                        },
                    });

                    savedFiles.push(mediaFile);

                    // Уведомляем Telegram
                    notifyTelegramGroup(mediaFile, chat.name, `User Upload: ${fileData.filename}`).catch(err => {
                        console.error('[API] Ошибка уведомления в Telegram (upload):', err);
                    });
                } catch (error) {
                    console.error(`[API] Ошибка сохранения файла ${fileData.filename}:`, error);
                }
            }

            // Обновляем updatedAt чата
            await prisma.mediaChat.update({
                where: { id: chatId },
                data: { updatedAt: new Date() },
            });

            // Инвалидируем кеш
            invalidateChatCache(chatId);

            res.status(201).json({
                success: true,
                data: {
                    requestId: mediaRequest.id,
                    files: savedFiles,
                },
            });
        } catch (error) {
            console.error('[API] ❌ Ошибка загрузки пользовательских медиа:', error);
            res.status(500).json({
                success: false,
                error: 'Ошибка при загрузке файлов',
            });
        }
    });

    return router;
}
