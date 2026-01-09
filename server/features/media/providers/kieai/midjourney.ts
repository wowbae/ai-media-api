// Midjourney провайдер через Kie.ai API
// Документация: https://kie.ai/model-preview/features/mj-api
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
    KieAiConfig,
    KieAiCreateRequest,
    KieAiCreateResponse,
    KieAiStatusResponse,
    KieAiTaskStatus,
    KieAiAspectRatio,
} from './interfaces';

// Маппинг статусов Kie.ai на внутренние статусы
const KIEAI_STATUS_MAP: Record<string, TaskStatusResult['status']> = {
    pending: 'pending',
    processing: 'processing',
    completed: 'done',
    done: 'done',
    failed: 'failed',
};

// Маппинг соотношений сторон
function mapAspectRatio(
    aspectRatio?: '1:1' | '9:16' | '16:9'
): KieAiAspectRatio | undefined {
    if (!aspectRatio) return undefined;
    return aspectRatio as KieAiAspectRatio;
}

export function createKieAiMidjourneyProvider(
    config: KieAiConfig
): MediaProvider {
    const { apiKey, baseURL } = config;

    // Создание задачи на генерацию изображения
    async function createImagineTask(
        params: GenerateParams
    ): Promise<KieAiCreateResponse> {
        console.log('[Kie.ai Midjourney] Создание задачи:', {
            prompt: params.prompt.substring(0, 100),
        });

        const requestBody: KieAiCreateRequest = {
            taskType: 'Text to Image',
            speed: 'fast', // По умолчанию fast, можно сделать настраиваемым
            prompt: params.prompt,
            aspectRatio: mapAspectRatio(params.aspectRatio),
            version: 'Version 7', // По умолчанию Version 7, можно сделать настраиваемым
            enableTranslation: false,
        };

        const response = await fetch(`${baseURL}/v1/midjourney`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorText = await response.text();
            let parsed: unknown;
            try {
                parsed = JSON.parse(errorText);
            } catch {
                parsed = errorText;
            }
            console.error('[Kie.ai Midjourney] Ошибка создания задачи:', {
                status: response.status,
                error: parsed,
            });

            // Обрабатываем типичные ошибки
            if (response.status === 401) {
                throw new Error('Ошибка авторизации Kie.ai API');
            }
            if (response.status === 402 || response.status === 403) {
                throw new Error('Недостаточно средств на балансе Kie.ai');
            }

            throw new Error(
                `Kie.ai Midjourney API error: ${response.status} - ${errorText}`
            );
        }

        const data = (await response.json()) as KieAiCreateResponse;

        console.log('[Kie.ai Midjourney] Задача создана:', {
            taskId: data.taskId,
            status: data.status,
        });

        return data;
    }

    // Получение результата задачи
    async function getTaskResultFromAPI(
        taskId: string
    ): Promise<KieAiStatusResponse> {
        const response = await fetch(`${baseURL}/v1/midjourney/${taskId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            let parsed: unknown;
            try {
                parsed = JSON.parse(errorText);
            } catch {
                parsed = errorText;
            }
            console.error('[Kie.ai Midjourney] Ошибка получения статуса:', {
                taskId,
                status: response.status,
                error: parsed,
            });
            throw new Error(
                `Kie.ai Midjourney API error: ${response.status} - ${errorText}`
            );
        }

        return (await response.json()) as KieAiStatusResponse;
    }

    return {
        name: 'kieai-midjourney',
        isAsync: true,

        async generate(params: GenerateParams): Promise<TaskCreatedResult> {
            const result = await createImagineTask(params);

            // Маппим статус на внутренний формат
            const mappedStatus =
                KIEAI_STATUS_MAP[result.status] || 'pending';

            return {
                taskId: result.taskId,
                status: mappedStatus === 'pending' ? 'pending' : 'processing',
            };
        },

        async checkTaskStatus(taskId: string): Promise<TaskStatusResult> {
            const result = await getTaskResultFromAPI(taskId);

            const mappedStatus =
                KIEAI_STATUS_MAP[result.status] || 'pending';

            // Логируем ошибки при статусе failed
            if (result.status === 'failed') {
                console.warn(
                    '[Kie.ai Midjourney] Задача завершилась с ошибкой:',
                    {
                        taskId,
                        status: result.status,
                        mappedStatus,
                        error: result.error,
                    }
                );
            } else {
                console.log('[Kie.ai Midjourney] Статус задачи:', {
                    taskId,
                    status: result.status,
                    mappedStatus,
                    hasResult: !!result.result,
                    error: result.error || undefined,
                });
            }

            // Получаем URL результата (может быть один или массив)
            const resultUrl =
                result.result?.url ||
                (result.result?.urls && result.result.urls[0]) ||
                undefined;

            return {
                status: mappedStatus,
                url: resultUrl,
                error: result.error || undefined,
            };
        },

        async getTaskResult(taskId: string): Promise<SavedFileInfo[]> {
            const result = await getTaskResultFromAPI(taskId);

            if (result.status !== 'completed' && result.status !== 'done') {
                throw new Error(
                    `Задача Kie.ai Midjourney не завершена: status=${result.status}, error=${result.error}`
                );
            }

            const files: SavedFileInfo[] = [];

            // Обрабатываем один URL
            if (result.result?.url) {
                console.log('[Kie.ai Midjourney] Скачивание результата:', {
                    taskId,
                    url: result.result.url,
                });
                const savedFile = await saveFileFromUrl(result.result.url);
                files.push(savedFile);
            }

            // Обрабатываем массив URL (если есть)
            if (result.result?.urls && result.result.urls.length > 0) {
                console.log(
                    '[Kie.ai Midjourney] Скачивание результатов:',
                    result.result.urls.length
                );
                for (const url of result.result.urls) {
                    const savedFile = await saveFileFromUrl(url);
                    files.push(savedFile);
                }
            }

            if (files.length === 0) {
                throw new Error(
                    `Не удалось получить результат задачи Kie.ai Midjourney: taskId=${taskId}`
                );
            }

            console.log(
                `[Kie.ai Midjourney] Файлы сохранены: ${files.length} файлов`
            );

            return files;
        },
    };
}
