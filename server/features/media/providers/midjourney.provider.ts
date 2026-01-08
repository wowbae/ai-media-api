// Midjourney провайдер через GPTunnel API
// Документация: https://docs.gptunnel.ru/api-midjourney/imagine
import type {
    MediaProvider,
    GenerateParams,
    TaskCreatedResult,
    TaskStatusResult,
} from './interfaces';
import type { SavedFileInfo } from '../file.service';
import { saveFileFromUrl } from '../file.service';

interface MidjourneyConfig {
    apiKey: string;
    baseURL: string;
}

// Ответ на создание задачи /imagine
interface MidjourneyImagineResponse {
    id: string;
    parentId: string | null;
    object: 'task';
    type: 'imagine';
    actions: string[];
    percent: number;
    status: 'idle' | 'processing' | 'done' | 'failed';
    result: string | null; // URL изображения
    error: string | null;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
        prompt_cost: number;
        completion_cost: number;
        total_cost: number;
    };
}

// Ответ на проверку статуса /result
interface MidjourneyResultResponse extends MidjourneyImagineResponse {
    // Та же структура, что и при создании
}

export function createMidjourneyProvider(config: MidjourneyConfig): MediaProvider {
    const { apiKey, baseURL } = config;

    // Создание задачи на генерацию изображения
    async function createImagineTask(
        prompt: string
    ): Promise<MidjourneyImagineResponse> {
        console.log('[Midjourney] Создание задачи /imagine:', {
            prompt: prompt.substring(0, 100),
        });

        const response = await fetch(`${baseURL}/v1/midjourney/imagine`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: apiKey,
            },
            body: JSON.stringify({
                prompt,
                useWalletBalance: true,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Midjourney] Ошибка создания задачи:', {
                status: response.status,
                error: errorText,
            });

            // Обрабатываем типичные ошибки GPTunnel
            if (response.status === 402) {
                throw new Error('Недостаточно средств на балансе GPTunnel');
            }
            if (response.status === 401) {
                throw new Error('Ошибка авторизации GPTunnel API');
            }

            throw new Error(
                `Midjourney API error: ${response.status} - ${errorText}`
            );
        }

        const data = (await response.json()) as MidjourneyImagineResponse;

        console.log('[Midjourney] Задача создана:', {
            taskId: data.id,
            status: data.status,
            percent: data.percent,
        });

        return data;
    }

    // Получение результата задачи
    async function getTaskResult(
        taskId: string
    ): Promise<MidjourneyResultResponse> {
        const response = await fetch(`${baseURL}/v1/midjourney/result`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: apiKey,
            },
            body: JSON.stringify({ id: taskId }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
                `Midjourney API error: ${response.status} - ${errorText}`
            );
        }

        return (await response.json()) as MidjourneyResultResponse;
    }

    return {
        name: 'midjourney',
        isAsync: true,

        async generate(params: GenerateParams): Promise<TaskCreatedResult> {
            const result = await createImagineTask(params.prompt);

            return {
                taskId: result.id,
                status: result.status === 'idle' ? 'pending' : 'processing',
            };
        },

        async checkTaskStatus(taskId: string): Promise<TaskStatusResult> {
            const result = await getTaskResult(taskId);

            console.log('[Midjourney] Статус задачи:', {
                taskId,
                status: result.status,
                percent: result.percent,
                hasResult: !!result.result,
                error: result.error,
            });

            // Маппим статусы Midjourney на наши
            const statusMap: Record<string, TaskStatusResult['status']> = {
                idle: 'pending',
                processing: 'processing',
                done: 'done',
                failed: 'failed',
            };

            return {
                status: statusMap[result.status] || 'pending',
                url: result.result || undefined,
                error: result.error || undefined,
            };
        },

        async getTaskResult(taskId: string): Promise<SavedFileInfo[]> {
            const result = await getTaskResult(taskId);

            if (result.status !== 'done' || !result.result) {
                throw new Error(
                    `Задача Midjourney не завершена: status=${result.status}, error=${result.error}`
                );
            }

            console.log('[Midjourney] Скачивание результата:', {
                taskId,
                url: result.result,
            });

            // Скачиваем и сохраняем изображение
            const savedFile = await saveFileFromUrl(result.result);

            console.log('[Midjourney] Файл сохранён:', savedFile.filename);

            return [savedFile];
        },
    };
}
