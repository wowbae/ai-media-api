// GPTunnel провайдер для работы с Veo 3.1 Fast и другими моделями GPTunnel
import type {
    MediaProvider,
    GenerateParams,
    TaskCreatedResult,
    TaskStatusResult,
} from './interfaces';
import type { SavedFileInfo } from '../file.service';
import { saveFileFromUrl } from '../file.service';

interface GPTunnelConfig {
    apiKey: string;
    baseURL: string;
}

interface GPTunnelCreateResponse {
    code: number;
    id: string;
    model: string;
    prompt: string;
    created_at: number;
    status: 'idle' | 'processing' | 'done' | 'failed';
    url: string | null;
}

interface GPTunnelResultResponse {
    code: number;
    id: string;
    model: string;
    prompt: string;
    created_at: number;
    status: 'idle' | 'processing' | 'done' | 'failed';
    url: string | null;
    error?: string;
}

// Маппинг моделей на ID GPTunnel API
const MODEL_IDS: Record<string, string> = {
    VEO_3_1_FAST: 'glabs-veo-3-1-fast',
    // Можно добавить другие модели GPTunnel в будущем
};

export function createGPTunnelProvider(config: GPTunnelConfig): MediaProvider {
    const { apiKey, baseURL } = config;

    async function createTask(
        params: GenerateParams
    ): Promise<GPTunnelCreateResponse> {
        const modelId = MODEL_IDS[params.model];
        if (!modelId) {
            throw new Error(`Модель ${params.model} не поддерживается GPTunnel`);
        }

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

        console.log('[GPTunnel] Создание задачи:', {
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

        const data = (await response.json()) as GPTunnelCreateResponse;

        if (data.code !== 0) {
            throw new Error(`GPTunnel error code: ${data.code}`);
        }

        console.log('[GPTunnel] Задача создана:', {
            taskId: data.id,
            status: data.status,
        });

        return data;
    }

    async function getResult(
        taskId: string
    ): Promise<GPTunnelResultResponse> {
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

        return (await response.json()) as GPTunnelResultResponse;
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

            console.log('[GPTunnel] Статус задачи:', {
                taskId,
                status: result.status,
                hasUrl: !!result.url,
            });

            // Маппим статусы GPTunnel на наши
            const statusMap: Record<string, TaskStatusResult['status']> = {
                idle: 'pending',
                processing: 'processing',
                done: 'done',
                failed: 'failed',
            };

            return {
                status: statusMap[result.status] || 'pending',
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

            console.log('[GPTunnel] Скачивание результата:', {
                taskId,
                url: result.url,
            });

            // Скачиваем и сохраняем файл
            const savedFile = await saveFileFromUrl(result.url);

            console.log('[GPTunnel] Файл сохранён:', savedFile.filename);

            return [savedFile];
        },
    };
}
