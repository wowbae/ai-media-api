// Сервис для работы с медиа-генерацией через абстракцию провайдеров
import { MediaModel, RequestStatus, Prisma } from '@prisma/client';
import { prisma } from 'prisma/client';
import { notifyTelegramGroup } from './telegram.notifier';
import {
    getProviderManager,
    isTaskCreatedResult,
    type GenerateParams,
    type TaskStatusResult,
} from './providers';
import type { SavedFileInfo } from './file.service';

// Интервал polling для async провайдеров (5 секунд)
const POLLING_INTERVAL = 5000;
// Максимальное время ожидания (10 минут)
const MAX_POLLING_TIME = 10 * 60 * 1000;

// Хранилище активных polling задач
const activePollingTasks = new Map<
    number,
    { taskId: string; providerName: string }
>();

// Основная функция генерации медиа через провайдеры
export async function generateMedia(
    requestId: number,
    prompt: string,
    model: MediaModel,
    inputFiles: string[] = [],
    format?: '9:16' | '16:9',
    quality?: '1k' | '2k' | '4k'
): Promise<SavedFileInfo[]> {
    const providerManager = getProviderManager();
    const provider = providerManager.getProvider(model);
    const modelConfig = providerManager.getModelConfig(model);

    console.log('[MediaService] 🚀 Генерация:', {
        requestId,
        model,
        provider: provider.name,
        isAsync: provider.isAsync,
        prompt: prompt.substring(0, 50),
        timestamp: new Date().toISOString(),
    });

    // Обновляем статус на PROCESSING
    await prisma.mediaRequest.update({
        where: { id: requestId },
        data: { status: RequestStatus.PROCESSING },
    });

    try {
        // Валидация промпта
        if (modelConfig && prompt.length > modelConfig.maxPromptLength) {
            throw new Error(
                `Промпт превышает максимальную длину ${modelConfig.maxPromptLength} символов`
            );
        }

        const generateParams: GenerateParams = {
            requestId,
            prompt,
            model,
            inputFiles,
            aspectRatio: format as '1:1' | '9:16' | '16:9' | undefined,
            quality,
        };

        const result = await provider.generate(generateParams);

        // Если провайдер async - запускаем polling
        if (isTaskCreatedResult(result)) {
            console.log('[MediaService] Async задача создана:', {
                taskId: result.taskId,
                provider: provider.name,
            });

            // Сохраняем информацию о задаче
            activePollingTasks.set(requestId, {
                taskId: result.taskId,
                providerName: provider.name,
            });

            // Запускаем polling в фоне
            pollTaskResult(requestId, result.taskId, provider.name, prompt);

            return []; // Файлы будут добавлены после завершения polling
        }

        // Sync провайдер - файлы уже готовы
        const savedFiles = result;

        // Сохраняем файлы в БД
        await saveFilesToDatabase(requestId, savedFiles, prompt);

        // Обновляем статус на COMPLETED
        await prisma.mediaRequest.update({
            where: { id: requestId },
            data: {
                status: RequestStatus.COMPLETED,
                completedAt: new Date(),
            },
        });

        console.log(
            `[MediaService] ✅ Генерация завершена: requestId=${requestId}, файлов: ${savedFiles.length}`
        );

        return savedFiles;
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
        console.error(
            `[MediaService] ❌ Ошибка: requestId=${requestId}:`,
            errorMessage
        );

        await prisma.mediaRequest.update({
            where: { id: requestId },
            data: {
                status: RequestStatus.FAILED,
                errorMessage,
            },
        });

        throw error;
    }
}

// Polling для async провайдеров
async function pollTaskResult(
    requestId: number,
    taskId: string,
    providerName: string,
    prompt: string
): Promise<void> {
    const startTime = Date.now();
    const providerManager = getProviderManager();

    console.log(`[MediaService] 🔄 Начало polling: requestId=${requestId}, taskId=${taskId}`);

    while (Date.now() - startTime < MAX_POLLING_TIME) {
        await sleep(POLLING_INTERVAL);

        // Проверяем, не была ли задача отменена
        if (!activePollingTasks.has(requestId)) {
            console.log(`[MediaService] Polling отменён: requestId=${requestId}`);
            return;
        }

        try {
            // Получаем провайдер заново (на случай hot reload)
            const request = await prisma.mediaRequest.findUnique({
                where: { id: requestId },
                include: { chat: true },
            });

            if (!request) {
                console.error(`[MediaService] Request не найден: ${requestId}`);
                activePollingTasks.delete(requestId);
                return;
            }

            const provider = providerManager.getProvider(request.chat.model);

            if (!provider.checkTaskStatus) {
                throw new Error(
                    `Провайдер ${provider.name} не поддерживает checkTaskStatus`
                );
            }

            const status: TaskStatusResult =
                await provider.checkTaskStatus(taskId);

            console.log(`[MediaService] Polling статус: requestId=${requestId}`, {
                status: status.status,
                hasUrl: !!status.url,
                error: status.error || undefined,
            });

            if (status.status === 'done') {
                if (!provider.getTaskResult) {
                    throw new Error(
                        `Провайдер ${provider.name} не поддерживает getTaskResult`
                    );
                }

                const savedFiles = await provider.getTaskResult(taskId);

                // Сохраняем файлы в БД
                await saveFilesToDatabase(requestId, savedFiles, prompt);

                // Обновляем статус на COMPLETED
                await prisma.mediaRequest.update({
                    where: { id: requestId },
                    data: {
                        status: RequestStatus.COMPLETED,
                        completedAt: new Date(),
                    },
                });

                activePollingTasks.delete(requestId);

                console.log(
                    `[MediaService] ✅ Async генерация завершена: requestId=${requestId}, файлов: ${savedFiles.length}`
                );
                return;
            }

            if (status.status === 'failed') {
                const errorMessage =
                    status.error ||
                    'Генерация не удалась. Детали ошибки не предоставлены провайдером.';
                console.error(
                    `[MediaService] ⚠️ Задача завершилась с ошибкой: requestId=${requestId}, taskId=${taskId}`,
                    {
                        error: status.error,
                        provider: provider.name,
                    }
                );
                throw new Error(errorMessage);
            }

            // pending или processing - продолжаем polling
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : 'Polling error';
            const errorStack =
                error instanceof Error ? error.stack : undefined;

            console.error(
                `[MediaService] ❌ Ошибка polling: requestId=${requestId}, taskId=${taskId}:`,
                errorMessage
            );

            if (errorStack) {
                console.error('[MediaService] Stack trace:', errorStack);
            }

            await prisma.mediaRequest.update({
                where: { id: requestId },
                data: {
                    status: RequestStatus.FAILED,
                    errorMessage,
                },
            });

            activePollingTasks.delete(requestId);
            return;
        }
    }

    // Timeout
    console.error(`[MediaService] ⏱️ Timeout polling: requestId=${requestId}`);

    await prisma.mediaRequest.update({
        where: { id: requestId },
        data: {
            status: RequestStatus.FAILED,
            errorMessage: 'Превышено время ожидания генерации',
        },
    });

    activePollingTasks.delete(requestId);
}

// Сохранение файлов в БД и отправка уведомлений
async function saveFilesToDatabase(
    requestId: number,
    savedFiles: SavedFileInfo[],
    prompt: string
): Promise<void> {
    const request = await prisma.mediaRequest.findUnique({
        where: { id: requestId },
        include: { chat: true },
    });

    if (!request) {
        throw new Error(`Request не найден: ${requestId}`);
    }

    // Удаляем дубликаты файлов по пути
    const uniqueFiles = savedFiles.filter(
        (file, index, self) =>
            index === self.findIndex((f) => f.path === file.path)
    );

    console.log(
        `[MediaService] Сохранение ${uniqueFiles.length} файлов для requestId=${requestId}`
    );

    for (const file of uniqueFiles) {
        const mediaFile = await prisma.mediaFile.create({
            data: {
                requestId,
                type: file.type,
                filename: file.filename,
                path: file.path,
                previewPath: file.previewPath,
                size: file.size,
                metadata: file.metadata as Prisma.InputJsonValue,
            },
        });

        console.log(`[MediaService] Файл сохранён: id=${mediaFile.id}`);

        // Отправляем уведомление в Telegram
        if (request.chat) {
            try {
                const telegramResult = await notifyTelegramGroup(
                    mediaFile,
                    request.chat.name,
                    prompt
                );
                console.log(
                    `[MediaService] Telegram: ${telegramResult ? 'отправлено' : 'не отправлено'}`
                );
            } catch (telegramError) {
                console.error('[MediaService] Ошибка Telegram:', telegramError);
            }
        }
    }
}

// Получение доступных моделей
export function getAvailableModels(): Array<{
    key: string;
    name: string;
    types: readonly string[];
    supportsImageInput: boolean;
}> {
    const providerManager = getProviderManager();
    return providerManager.getAvailableModels();
}

// Вспомогательная функция для задержки
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
