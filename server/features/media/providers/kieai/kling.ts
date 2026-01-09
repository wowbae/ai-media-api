// Kling 2.6 провайдер через Kie.ai API
// Документация: https://kie.ai/kling-2-6
import type {
    MediaProvider,
    GenerateParams,
    TaskCreatedResult,
    TaskStatusResult,
} from '../interfaces';
import { PROVIDER_STATUS_MAP } from '../interfaces';
import type { SavedFileInfo } from '../../file.service';
import { saveFileFromUrl } from '../../file.service';
import { uploadToImgbb, isImgbbConfigured } from '../../imgbb.service';
import type {
    KieAiConfig,
    KieAiCreateResponse,
    KieAiStatusResponse,
    KieAiTaskStatus,
    KieAiKlingTextToVideoRequest,
    KieAiKlingImageToVideoRequest,
    KieAiKlingAspectRatio,
    KieAiKlingDuration,
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
function mapKlingAspectRatio(
    aspectRatio?: '1:1' | '9:16' | '16:9'
): KieAiKlingAspectRatio {
    if (aspectRatio === '9:16') return '9:16';
    if (aspectRatio === '16:9') return '16:9';
    return '1:1'; // По умолчанию
}

// Маппинг длительности
function mapKlingDuration(duration?: number): KieAiKlingDuration {
    if (duration === 10) return '10';
    return '5'; // По умолчанию 5 секунд
}

export function createKieAiKlingProvider(
    config: KieAiConfig
): MediaProvider {
    const { apiKey, baseURL } = config;

    // Создание задачи на генерацию видео
    async function createKlingTask(
        params: GenerateParams
    ): Promise<KieAiCreateResponse> {
        console.log('[Kie.ai Kling 2.6] Создание задачи:', {
            prompt: params.prompt.substring(0, 100),
            hasInputFiles: !!(params.inputFiles && params.inputFiles.length > 0),
        });

        const isImageToVideo = params.inputFiles && params.inputFiles.length > 0;
        const duration = mapKlingDuration(params.duration);
        const sound = params.sound ?? true; // По умолчанию звук включен

        // Формируем модель в зависимости от типа запроса
        const model = isImageToVideo
            ? 'kling-2.6/image-to-video'
            : 'kling-2.6/text-to-video';

        // Формируем input объект
        const input: Record<string, unknown> = {
            prompt: params.prompt,
            sound,
            duration,
        };

        if (isImageToVideo) {
            // Image-to-Video режим
            const inputImage = params.inputFiles[0];

            // Если это data URL (base64) - загружаем на imgbb
            let imageUrl: string;
            if (inputImage.startsWith('data:')) {
                if (!isImgbbConfigured()) {
                    throw new Error(
                        'IMGBB_API_KEY не настроен. Для image-to-video нужен imgbb.'
                    );
                }
                console.log('[Kie.ai Kling 2.6] Загрузка изображения на imgbb...');
                imageUrl = await uploadToImgbb(inputImage);
            } else {
                // Уже URL - используем как есть
                imageUrl = inputImage;
            }

            input.image_urls = [imageUrl];
        } else {
            // Text-to-Video режим
            const aspectRatio = mapKlingAspectRatio(params.aspectRatio);
            input.aspect_ratio = aspectRatio;
        }

        // Формируем тело запроса согласно документации
        const requestBody = {
            model,
            callBackUrl: '', // Можно оставить пустым, если не используется callback
            input,
        };

        const response = await fetch(`${baseURL}/api/v1/jobs/createTask`, {
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
            console.error('[Kie.ai Kling 2.6] Ошибка создания задачи:', {
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
                `Kie.ai Kling 2.6 API error: ${response.status} - ${errorText}`
            );
        }

        const data = (await response.json()) as unknown;

        console.log('[Kie.ai Kling 2.6] Полный ответ API:', JSON.stringify(data, null, 2));

        // Пытаемся извлечь taskId из разных возможных полей
        const taskId =
            (data as { taskId?: string }).taskId ||
            (data as { task_id?: string }).task_id ||
            (data as { id?: string }).id ||
            (data as { jobId?: string }).jobId ||
            (data as { job_id?: string }).job_id;

        if (!taskId) {
            console.error('[Kie.ai Kling 2.6] Не удалось найти taskId в ответе:', data);
            throw new Error(
                `Не удалось получить taskId от API. Ответ: ${JSON.stringify(data)}`
            );
        }

        const status =
            (data as { status?: string }).status || 'pending';

        console.log('[Kie.ai Kling 2.6] Задача создана:', {
            taskId,
            status,
        });

        return {
            taskId,
            status: status as KieAiTaskStatus,
        } as KieAiCreateResponse;
    }

    // Получение результата задачи
    async function getTaskResultFromAPI(
        taskId: string
    ): Promise<KieAiStatusResponse> {
        const response = await fetch(`${baseURL}/api/v1/jobs/${taskId}`, {
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
            console.error('[Kie.ai Kling 2.6] Ошибка получения статуса:', {
                taskId,
                status: response.status,
                error: parsed,
            });
            throw new Error(
                `Kie.ai Kling 2.6 API error: ${response.status} - ${errorText}`
            );
        }

        return (await response.json()) as KieAiStatusResponse;
    }

    return {
        name: 'kieai-kling',
        isAsync: true,

        async generate(params: GenerateParams): Promise<TaskCreatedResult> {
            const result = await createKlingTask(params);

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
                    '[Kie.ai Kling 2.6] Задача завершилась с ошибкой:',
                    {
                        taskId,
                        status: result.status,
                        mappedStatus,
                        error: result.error,
                    }
                );
            } else {
                console.log('[Kie.ai Kling 2.6] Статус задачи:', {
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
                    `Задача Kie.ai Kling 2.6 не завершена: status=${result.status}, error=${result.error}`
                );
            }

            const files: SavedFileInfo[] = [];

            // Обрабатываем один URL
            if (result.result?.url) {
                console.log('[Kie.ai Kling 2.6] Скачивание результата:', {
                    taskId,
                    url: result.result.url,
                });
                const savedFile = await saveFileFromUrl(result.result.url);
                files.push(savedFile);
            }

            // Обрабатываем массив URL (если есть)
            if (result.result?.urls && result.result.urls.length > 0) {
                console.log(
                    '[Kie.ai Kling 2.6] Скачивание результатов:',
                    result.result.urls.length
                );
                for (const url of result.result.urls) {
                    const savedFile = await saveFileFromUrl(url);
                    files.push(savedFile);
                }
            }

            if (files.length === 0) {
                throw new Error(
                    `Не удалось получить результат задачи Kie.ai Kling 2.6: taskId=${taskId}`
                );
            }

            console.log(
                `[Kie.ai Kling 2.6] Файлы сохранены: ${files.length} файлов`
            );

            return files;
        },
    };
}
