// Сервис для работы с медиа-генерацией через абстракцию провайдеров
import { MediaModel, RequestStatus } from '@prisma/client';
import { prisma } from 'prisma/client';
import {
    getProviderManager,
    isTaskCreatedResult,
    type GenerateParams,
    type TaskStatusResult,
} from './providers';
import type { SavedFileInfo } from './file.service';
import { saveFilesToDatabase } from './database.service';

// Интервал polling для async провайдеров (5 секунд)
const POLLING_INTERVAL = 5000;
// Максимальное время ожидания (10 минут)
const MAX_POLLING_TIME = 10 * 60 * 1000;

// Хранилище активных polling задач
const activePollingTasks = new Map<
    number,
    { taskId: string; providerName: string; model?: MediaModel }
>();

// Основная функция генерации медиа через провайдеры
export async function generateMedia(
    requestId: number,
    prompt: string,
    model: MediaModel,
    inputFiles: string[] = [],
    format?: '9:16' | '16:9',
    quality?: '1k' | '2k' | '4k',
    videoQuality?: '480p' | '720p' | '1080p',
    duration?: number,
    ar?: '16:9' | '9:16',
    sound?: boolean
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
            videoQuality,
            duration,
            ar,
            sound,
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
                model,
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

        // Форматируем сообщение об ошибке с информацией о модели и провайдере
        const formattedErrorMessage = formatErrorMessage(
            errorMessage,
            model,
            provider.name
        );

        await prisma.mediaRequest.update({
            where: { id: requestId },
            data: {
                status: RequestStatus.FAILED,
                errorMessage: formattedErrorMessage,
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

    console.log(
        `[MediaService] 🔄 Начало polling: requestId=${requestId}, taskId=${taskId}`
    );

    // Проверяем текущий статус запроса перед началом polling
    // Если запрос уже завершен, не начинаем polling
    const initialRequest = await prisma.mediaRequest.findUnique({
        where: { id: requestId },
        select: { status: true },
    });

    if (!initialRequest) {
        console.error(
            `[MediaService] Request не найден при старте polling: requestId=${requestId}`
        );
        activePollingTasks.delete(requestId);
        return;
    }

    // Если запрос уже в финальном статусе, не начинаем polling
    if (
        initialRequest.status === RequestStatus.COMPLETED ||
        initialRequest.status === RequestStatus.FAILED
    ) {
        console.log(
            `[MediaService] Запрос уже завершен, polling не требуется: requestId=${requestId}, status=${initialRequest.status}`
        );
        activePollingTasks.delete(requestId);
        return;
    }

    while (Date.now() - startTime < MAX_POLLING_TIME) {
        await sleep(POLLING_INTERVAL);

        // Проверяем, не была ли задача отменена
        if (!activePollingTasks.has(requestId)) {
            console.log(
                `[MediaService] Polling отменён: requestId=${requestId}`
            );
            // Обновляем статус на FAILED при отмене
            await prisma.mediaRequest.update({
                where: { id: requestId },
                data: {
                    status: RequestStatus.FAILED,
                    errorMessage: 'Генерация отменена',
                },
            });
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

            // Используем модель из запроса, а не из чата
            const requestModel = request.model || request.chat.model;
            const provider = providerManager.getProvider(requestModel);

            if (!provider.checkTaskStatus) {
                throw new Error(
                    `Провайдер ${provider.name} не поддерживает checkTaskStatus`
                );
            }

            const status: TaskStatusResult =
                await provider.checkTaskStatus(taskId);

            console.log(
                `[MediaService] Polling статус: requestId=${requestId}`,
                {
                    status: status.status,
                    hasUrl: !!status.url,
                    error: status.error || undefined,
                }
            );

            if (status.status === 'done') {
                if (!provider.getTaskResult) {
                    throw new Error(
                        `Провайдер ${provider.name} не поддерживает getTaskResult`
                    );
                }

                const savedFiles = await provider.getTaskResult(taskId);

                // Сохраняем файлы в БД
                await saveFilesToDatabase(requestId, savedFiles, prompt);

                // Небольшая задержка для гарантии, что все файлы сохранены в БД и транзакции завершены
                await new Promise((resolve) => setTimeout(resolve, 200));

                // Обновляем статус на COMPLETED
                await prisma.mediaRequest.update({
                    where: { id: requestId },
                    data: {
                        status: RequestStatus.COMPLETED,
                        completedAt: new Date(),
                    },
                });

                // Дополнительная задержка после обновления статуса для синхронизации БД
                await new Promise((resolve) => setTimeout(resolve, 100));

                activePollingTasks.delete(requestId);

                console.log(
                    `[MediaService] ✅ Async генерация завершена: requestId=${requestId}, файлов: ${savedFiles.length}`
                );
                return;
            }

            if (status.status === 'failed') {
                const baseErrorMessage =
                    status.error ||
                    'Генерация не удалась. Детали ошибки не предоставлены провайдером.';

                // Форматируем сообщение об ошибке с информацией о модели и провайдере
                const formattedErrorMessage = formatErrorMessage(
                    baseErrorMessage,
                    requestModel,
                    provider.name
                );

                console.error(
                    `[MediaService] ⚠️ Задача завершилась с ошибкой: requestId=${requestId}, taskId=${taskId}`,
                    {
                        error: status.error,
                        provider: provider.name,
                        model: requestModel,
                    }
                );
                throw new Error(formattedErrorMessage);
            }

            // pending или processing - продолжаем polling
        } catch (error) {
            const baseErrorMessage =
                error instanceof Error ? error.message : 'Polling error';
            const errorStack = error instanceof Error ? error.stack : undefined;

            console.error(
                `[MediaService] ❌ Ошибка polling: requestId=${requestId}, taskId=${taskId}:`,
                baseErrorMessage
            );

            if (errorStack) {
                console.error('[MediaService] Stack trace:', errorStack);
            }

            // Получаем модель из запроса для форматирования ошибки
            const request = await prisma.mediaRequest.findUnique({
                where: { id: requestId },
                select: { model: true },
            });

            const requestModel = request?.model || null;
            const taskInfo = activePollingTasks.get(requestId);
            const formattedErrorMessage = formatErrorMessage(
                baseErrorMessage,
                requestModel || taskInfo?.model || null,
                taskInfo?.providerName
            );

            await prisma.mediaRequest.update({
                where: { id: requestId },
                data: {
                    status: RequestStatus.FAILED,
                    errorMessage: formattedErrorMessage,
                },
            });

            activePollingTasks.delete(requestId);
            return;
        }
    }

    // Timeout
    console.error(`[MediaService] ⏱️ Timeout polling: requestId=${requestId}`);

    // Получаем модель из запроса для форматирования ошибки
    const request = await prisma.mediaRequest.findUnique({
        where: { id: requestId },
        select: { model: true },
    });

    const requestModel = request?.model || null;
    const taskInfo = activePollingTasks.get(requestId);
    const formattedErrorMessage = formatErrorMessage(
        'Превышено время ожидания генерации',
        requestModel || taskInfo?.model || null,
        taskInfo?.providerName
    );

    await prisma.mediaRequest.update({
        where: { id: requestId },
        data: {
            status: RequestStatus.FAILED,
            errorMessage: formattedErrorMessage,
        },
    });

    activePollingTasks.delete(requestId);
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

// Вспомогательная функция для форматирования сообщения об ошибке с информацией о модели и провайдере
function formatErrorMessage(
    errorMessage: string,
    model: MediaModel | null,
    providerName?: string
): string {
    if (!model) return errorMessage;

    const providerManager = getProviderManager();
    const modelConfig = providerManager.getModelConfig(model);
    const displayProviderName =
        providerName || modelConfig?.provider || 'unknown';

    return `[${modelConfig?.name || model} (${displayProviderName})] ${errorMessage}`;
}

// Вспомогательная функция для задержки
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
