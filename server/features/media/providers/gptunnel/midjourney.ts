// Midjourney провайдер через GPTunnel /v1/midjourney API
// Документация: https://docs.gptunnel.ru/api-midjourney/imagine
import type {
    MediaProvider,
    GenerateParams,
    TaskCreatedResult,
    TaskStatusResult,
} from '../interfaces';
import { PROVIDER_STATUS_MAP } from '../interfaces';
import type { SavedFileInfo } from '../../file.service';
import { saveFileFromUrl } from '../../file.service';
import type {
    GPTunnelConfig,
    MidjourneyImagineResponse,
    MidjourneyResultResponse,
} from './interfaces';

export function createMidjourneyProvider(
    config: GPTunnelConfig
): MediaProvider {
    const { apiKey, baseURL } = config;

    // Создание задачи на генерацию изображения
    async function createImagineTask(
        prompt: string
    ): Promise<MidjourneyImagineResponse> {
        console.log('[GPTunnel Midjourney] Создание задачи /imagine:', {
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
            let parsed: unknown;
            try {
                parsed = JSON.parse(errorText);
            } catch {
                parsed = errorText;
            }
            console.error('[GPTunnel Midjourney] Ошибка создания задачи:', {
                status: response.status,
                error: parsed,
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

        console.log('[GPTunnel Midjourney] Задача создана:', {
            taskId: data.id,
            status: data.status,
            percent: data.percent,
        });

        return data;
    }

    // Получение результата задачи
    async function getTaskResultFromAPI(
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
            let parsed: unknown;
            try {
                parsed = JSON.parse(errorText);
            } catch {
                parsed = errorText;
            }
            console.error('[GPTunnel Midjourney] Ошибка получения статуса:', {
                taskId,
                status: response.status,
                error: parsed,
            });
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
            const result = await getTaskResultFromAPI(taskId);

            const mappedStatus =
                PROVIDER_STATUS_MAP[result.status] || 'pending';

            // Логируем ошибки при статусе failed
            if (result.status === 'failed') {
                console.warn(
                    '[GPTunnel Midjourney] Задача завершилась с ошибкой:',
                    {
                        taskId,
                        status: result.status,
                        mappedStatus,
                        percent: result.percent,
                        error: result.error,
                    }
                );
            } else {
                console.log('[GPTunnel Midjourney] Статус задачи:', {
                    taskId,
                    status: result.status,
                    mappedStatus,
                    percent: result.percent,
                    hasResult: !!result.result,
                    error: result.error || undefined,
                });
            }

            return {
                status: mappedStatus,
                url: result.result || undefined,
                error: result.error || undefined,
            };
        },

        async getTaskResult(taskId: string): Promise<SavedFileInfo[]> {
            const result = await getTaskResultFromAPI(taskId);

            if (result.status !== 'done' || !result.result) {
                throw new Error(
                    `Задача Midjourney не завершена: status=${result.status}, error=${result.error}`
                );
            }

            console.log('[GPTunnel Midjourney] Скачивание результата:', {
                taskId,
                url: result.result,
            });

            // Скачиваем и сохраняем изображение
            const savedFile = await saveFileFromUrl(result.result);

            console.log(
                '[GPTunnel Midjourney] Файл сохранён:',
                savedFile.filename
            );

            return [savedFile];
        },
    };
}
