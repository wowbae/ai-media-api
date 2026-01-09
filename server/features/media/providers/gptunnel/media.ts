// GPTunnel Media провайдер для работы с /v1/media API
// Используется для Veo 3.1 Fast и других моделей GPTunnel
import type {
    MediaProvider,
    GenerateParams,
    TaskCreatedResult,
    TaskStatusResult,
} from '../interfaces';
import { PROVIDER_STATUS_MAP } from '../interfaces';
import type { SavedFileInfo } from '../../file.service';
import { saveFileFromUrl } from '../../file.service';
import { MEDIA_MODELS } from '../../config';
import type {
    GPTunnelConfig,
    GPTunnelMediaCreateResponse,
    GPTunnelMediaResultResponse,
} from './interfaces';

export function createGPTunnelMediaProvider(config: GPTunnelConfig): MediaProvider {
    const { apiKey, baseURL } = config;

    async function createTask(
        params: GenerateParams
    ): Promise<GPTunnelMediaCreateResponse> {
        const modelConfig = MEDIA_MODELS[params.model as string];
        if (!modelConfig || modelConfig.provider !== 'gptunnel') {
            throw new Error(`Модель ${params.model} не поддерживается GPTunnel`);
        }
        const modelId = modelConfig.id;

        const body: Record<string, unknown> = {
            model: modelId,
            prompt: params.prompt,
        };

        // Добавляем изображение для первого кадра (image-to-video)
        if (params.inputFiles && params.inputFiles.length > 0) {
            body.images = [params.inputFiles[0]];
        }

        // Добавляем соотношение сторон
        if (params.aspectRatio) {
            body.ar = params.aspectRatio;
        }

        // Для модели Sora добавляем специальные параметры
        if (modelId === 'sora') {
            if (params.videoQuality) {
                body.quality = params.videoQuality;
            }
            if (params.duration !== undefined) {
                // Валидация duration (1-20 секунд)
                if (params.duration < 1 || params.duration > 20) {
                    throw new Error(
                        'Длительность видео должна быть от 1 до 20 секунд'
                    );
                }
                body.duration = params.duration;
            }
        }

        console.log('[GPTunnel Media] Создание задачи:', {
            model: modelId,
            prompt: params.prompt.substring(0, 50),
            hasImages: !!body.images,
            ar: body.ar,
            quality: body.quality,
            duration: body.duration,
        });

        const response = await fetch(`${baseURL}/v1/media/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: apiKey,
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
                `GPTunnel API error: ${response.status} - ${errorText}`
            );
        }

        const data = (await response.json()) as GPTunnelMediaCreateResponse;

        if (data.code !== 0) {
            throw new Error(`GPTunnel error code: ${data.code}`);
        }

        console.log('[GPTunnel Media] Задача создана:', {
            taskId: data.id,
            status: data.status,
        });

        return data;
    }

    async function getResult(
        taskId: string
    ): Promise<GPTunnelMediaResultResponse> {
        const response = await fetch(`${baseURL}/v1/media/result`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: apiKey,
            },
            body: JSON.stringify({ task_id: taskId }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
                `GPTunnel API error: ${response.status} - ${errorText}`
            );
        }

        const data = (await response.json()) as GPTunnelMediaResultResponse;

        // Проверяем code в ответе только если это критическая ошибка API (не статус задачи)
        // Статус "failed" обрабатывается нормально через checkTaskStatus
        if (data.code !== 0 && data.status !== 'failed') {
            const errorMessage = data.error || `GPTunnel error code: ${data.code}`;
            console.error('[GPTunnel Media] Критическая ошибка API:', {
                taskId,
                code: data.code,
                status: data.status,
                error: data.error,
                fullResponse: data,
            });
            throw new Error(errorMessage);
        }

        // Логируем ошибки даже если code === 0, но статус failed
        if (data.status === 'failed') {
            console.warn('[GPTunnel Media] Задача завершилась с ошибкой:', {
                taskId,
                code: data.code,
                status: data.status,
                error: data.error,
            });
        }

        return data;
    }

    return {
        name: 'gptunnel',
        isAsync: true,

        async generate(
            params: GenerateParams
        ): Promise<TaskCreatedResult> {
            const result = await createTask(params);

            return {
                taskId: result.id,
                status: result.status === 'idle' ? 'pending' : 'processing',
            };
        },

        async checkTaskStatus(taskId: string): Promise<TaskStatusResult> {
            const result = await getResult(taskId);

            const mappedStatus = PROVIDER_STATUS_MAP[result.status] || 'pending';

            console.log('[GPTunnel Media] Статус задачи:', {
                taskId,
                status: result.status,
                mappedStatus,
                hasUrl: !!result.url,
                error: result.error || undefined,
                code: result.code,
            });

            return {
                status: mappedStatus,
                url: result.url || undefined,
                error: result.error || undefined,
            };
        },

        async getTaskResult(taskId: string): Promise<SavedFileInfo[]> {
            const result = await getResult(taskId);

            if (result.status !== 'done' || !result.url) {
                throw new Error(
                    `Задача не завершена: status=${result.status}`
                );
            }

            console.log('[GPTunnel Media] Скачивание результата:', {
                taskId,
                url: result.url,
            });

            // Скачиваем и сохраняем файл
            const savedFile = await saveFileFromUrl(result.url);

            console.log('[GPTunnel Media] Файл сохранён:', savedFile.filename);

            return [savedFile];
        },
    };
}
