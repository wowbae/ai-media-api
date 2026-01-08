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

        console.log('[GPTunnel Media] Создание задачи:', {
            model: modelId,
            prompt: params.prompt.substring(0, 50),
            hasImages: !!body.images,
            ar: body.ar,
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

        return (await response.json()) as GPTunnelMediaResultResponse;
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

            console.log('[GPTunnel Media] Статус задачи:', {
                taskId,
                status: result.status,
                hasUrl: !!result.url,
            });

            return {
                status: PROVIDER_STATUS_MAP[result.status] || 'pending',
                url: result.url || undefined,
                error: result.error,
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
