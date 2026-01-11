// Veo 3.1 провайдер через Kie.ai API
// Документация: https://docs.kie.ai/veo3-api/generate-veo-3-video
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
import { MEDIA_MODELS } from '../../config';
import type {
    KieAiConfig,
    KieAiUnifiedCreateResponse,
    KieAiUnifiedTaskResponse,
} from './interfaces';

// Маппинг статусов Kie.ai на внутренние статусы
const KIEAI_STATUS_MAP: Record<string, TaskStatusResult['status']> = {
    waiting: 'pending',
    queuing: 'pending',
    generating: 'processing',
    success: 'done',
    completed: 'done',
    done: 'done',
    fail: 'failed',
    failed: 'failed',
};

// Типы для Veo 3.1 API
type Veo3Model = 'veo3' | 'veo3_fast';
type Veo3AspectRatio = '16:9' | '9:16' | 'Auto';
type Veo3GenerationType =
    | 'TEXT_2_VIDEO'
    | 'FIRST_AND_LAST_FRAMES_2_VIDEO'
    | 'REFERENCE_2_VIDEO';

interface Veo3GenerateRequest {
    prompt: string;
    imageUrls?: string[];
    model?: Veo3Model;
    generationType?: Veo3GenerationType;
    aspectRatio?: Veo3AspectRatio;
    seeds?: number; // 10000-99999
    watermark?: string;
    enableTranslation?: boolean;
    callBackUrl?: string;
}

// Маппинг модели из MediaModel в Veo3Model
function mapVeo3Model(model: string): Veo3Model {
    if (model === 'VEO_3_1') return 'veo3';
    if (model === 'VEO_3_1_FAST') return 'veo3_fast';
    // По умолчанию fast для совместимости
    return 'veo3_fast';
}

// Маппинг соотношения сторон
function mapVeo3AspectRatio(
    aspectRatio?: '1:1' | '9:16' | '16:9'
): Veo3AspectRatio {
    if (aspectRatio === '9:16') return '9:16';
    if (aspectRatio === '16:9') return '16:9';
    return '16:9'; // По умолчанию
}

// Определение типа генерации на основе параметров
// Согласно документации:
// - FIRST_AND_LAST_FRAMES_2_VIDEO: 1-2 изображения (не требует ограничений по модели/aspectRatio)
// - REFERENCE_2_VIDEO: 1-3 изображения (требует veo3_fast и 16:9)
function determineGenerationType(
    inputFiles?: string[],
    model?: Veo3Model,
    aspectRatio?: Veo3AspectRatio
): Veo3GenerationType | undefined {
    if (!inputFiles || inputFiles.length === 0) {
        return 'TEXT_2_VIDEO';
    }

    const fileCount = inputFiles.length;

    // Для 1 изображения всегда используем FIRST_AND_LAST_FRAMES_2_VIDEO
    // (REFERENCE_2_VIDEO тоже поддерживает 1 изображение, но требует veo3_fast + 16:9)
    if (fileCount === 1) {
        return 'FIRST_AND_LAST_FRAMES_2_VIDEO';
    }

    // Для 2 изображений: используем REFERENCE_2_VIDEO только если veo3_fast + 16:9,
    // иначе используем FIRST_AND_LAST_FRAMES_2_VIDEO (не требует ограничений)
    if (fileCount === 2) {
        if (model === 'veo3_fast' && aspectRatio === '16:9') {
            return 'REFERENCE_2_VIDEO';
        }
        return 'FIRST_AND_LAST_FRAMES_2_VIDEO';
    }

    // Для 3 изображений: только REFERENCE_2_VIDEO (требует veo3_fast + 16:9)
    if (fileCount === 3) {
        return 'REFERENCE_2_VIDEO';
    }

    // По умолчанию пусть API определит
    return undefined;
}

export function createKieAiVeo3Provider(config: KieAiConfig): MediaProvider {
    const { apiKey, baseURL } = config;

    // Загрузка файла на imgbb если нужно
    async function uploadFileToImgbb(fileUrlOrPath: string): Promise<string> {
        console.log(
            '[Kie.ai Veo 3.1] Обработка файла:',
            fileUrlOrPath.substring(0, 50) + '...'
        );

        // Если это уже URL - используем как есть
        if (
            fileUrlOrPath.startsWith('http://') ||
            fileUrlOrPath.startsWith('https://')
        ) {
            console.log('[Kie.ai Veo 3.1] Файл уже является публичным URL');
            return fileUrlOrPath;
        }

        // Если это data URL (base64) - загружаем на imgbb
        if (fileUrlOrPath.startsWith('data:')) {
            if (!isImgbbConfigured()) {
                throw new Error(
                    'IMGBB_API_KEY не настроен. Для image-to-video нужен imgbb.'
                );
            }
            console.log(
                '[Kie.ai Veo 3.1] Загрузка base64 изображения на imgbb...'
            );
            const publicUrl = await uploadToImgbb(fileUrlOrPath);
            console.log('[Kie.ai Veo 3.1] Изображение загружено:', publicUrl);
            return publicUrl;
        }

        // Если это локальный путь - ошибка
        throw new Error(
            `Kie.ai Veo 3.1 требует публичные URLs или base64 изображений. ` +
                `Получен неподдерживаемый формат: ${fileUrlOrPath.substring(0, 100)}`
        );
    }

    // Создание задачи на генерацию видео
    async function createVeo3Task(
        params: GenerateParams
    ): Promise<KieAiUnifiedCreateResponse> {
        console.log('[Kie.ai Veo 3.1] Создание задачи:', {
            model: params.model,
            prompt: params.prompt.substring(0, 100),
            hasInputFiles: !!(
                params.inputFiles && params.inputFiles.length > 0
            ),
            ar: params.ar,
            aspectRatio: params.aspectRatio,
        });

        const modelConfig = MEDIA_MODELS[params.model as string];
        if (!modelConfig || modelConfig.provider !== 'kieai') {
            throw new Error(
                `Модель ${params.model} не поддерживается Kie.ai Veo 3.1`
            );
        }

        const veo3Model = mapVeo3Model(params.model as string);
       // Для Veo 3.1 используем параметр ar (16:9 | 9:16), если он есть, иначе aspectRatio
        // Veo 3.1 поддерживает только 16:9 и 9:16, поэтому фильтруем другие форматы
        const aspectRatioForVeo =
            params.ar ||
            (params.aspectRatio === '16:9' || params.aspectRatio === '9:16'
                ? params.aspectRatio
                : undefined);
        const aspectRatio = mapVeo3AspectRatio(aspectRatioForVeo);

        // Определяем тип генерации:
        // 1. Если передан явно через params - используем его
        // 2. Иначе определяем автоматически на основе файлов, модели и aspectRatio
        const generationType = params.generationType || determineGenerationType(
            params.inputFiles,
            veo3Model,
            aspectRatio
        );

        // Формируем тело запроса
        const requestBody: Veo3GenerateRequest = {
            prompt: params.prompt,
            model: veo3Model,
            aspectRatio,
            enableTranslation: true, // По умолчанию включено
        };

        // Добавляем generationType если определен
        if (generationType) {
            requestBody.generationType = generationType;
        }

        // Обрабатываем входные изображения
        if (params.inputFiles && params.inputFiles.length > 0) {
            const imageUrls: string[] = [];
            for (const file of params.inputFiles) {
                const url = await uploadFileToImgbb(file);
                imageUrls.push(url);
            }
            requestBody.imageUrls = imageUrls;

            // Для REFERENCE_2_VIDEO нужно ограничение: только veo3_fast и 16:9
            if (
                generationType === 'REFERENCE_2_VIDEO' &&
                (veo3Model !== 'veo3_fast' || aspectRatio !== '16:9')
            ) {
                console.warn(
                    '[Kie.ai Veo 3.1] REFERENCE_2_VIDEO требует veo3_fast и 16:9. Автоматически изменяем параметры.'
                );
                requestBody.model = 'veo3_fast';
                requestBody.aspectRatio = '16:9';
            }
        }

        // Добавляем дополнительные параметры если есть
        if (params.seed !== undefined) {
            const seedNum =
                typeof params.seed === 'number'
                    ? params.seed
                    : parseInt(params.seed, 10);
            if (seedNum >= 10000 && seedNum <= 99999) {
                requestBody.seeds = seedNum;
            }
        }

        // Водяной знак и другие параметры можно добавить из settings если нужно
        // В будущем можно добавить поддержку watermark через GenerateParams

        const response = await fetch(`${baseURL}/api/v1/veo/generate`, {
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
            console.error('[Kie.ai Veo 3.1] Ошибка создания задачи:', {
                status: response.status,
                error: parsed,
            });

            if (response.status === 401) {
                throw new Error('Ошибка авторизации Kie.ai API');
            }
            if (response.status === 402 || response.status === 403) {
                throw new Error('Недостаточно средств на балансе Kie.ai');
            }

            throw new Error(
                `Kie.ai Veo 3.1 API error: ${response.status} - ${errorText}`
            );
        }

        const responseData =
            (await response.json()) as KieAiUnifiedCreateResponse;

        if (responseData.code !== 200) {
            throw new Error(
                `Kie.ai Veo 3.1 API вернул ошибку: ${responseData.code} - ${responseData.msg}`
            );
        }

        console.log(
            '[Kie.ai Veo 3.1] Задача создана:',
            responseData.data.taskId
        );
        return responseData;
    }

    // Получение статуса задачи через API
    // Veo 3.1 использует специфичный endpoint /api/v1/veo/record-info
    async function getTaskResultFromAPI(taskId: string): Promise<{
        code: number;
        msg: string;
        data: {
            taskId: string;
            state?: 'waiting' | 'queuing' | 'generating' | 'success' | 'fail';
            paramJson?: string;
            resultJson?: string;
            failMsg?: string;
            failCode?: string;
            completeTime?: number;
            createTime?: number;
            updateTime?: number;
            response?: {
                taskId: string;
                resultUrls?: string[];
                originUrls?: string[];
            };
        };
    }> {
        // Veo 3.1 использует специфичный endpoint согласно документации
        const url = `${baseURL}/api/v1/veo/record-info?taskId=${encodeURIComponent(taskId)}`;

        console.log(`[Kie.ai Veo 3.1] Запрос к эндпоинту: ${url}`);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Kie.ai Veo 3.1] Ошибка API:', {
                taskId,
                status: response.status,
                error: errorText,
            });
            throw new Error(
                `Kie.ai Veo 3.1 API error: ${response.status} - ${errorText}`
            );
        }

        const apiResponse = (await response.json()) as {
            code: number;
            msg: string;
            data: {
                taskId: string;
                paramJson?: string;
                completeTime?: string;
                response?: {
                    taskId: string;
                    resultUrls?: string[];
                    originUrls?: string[];
                };
            };
        };

        if (apiResponse.code !== 200) {
            throw new Error(
                `Kie.ai Veo 3.1 API вернул ошибку: ${apiResponse.code} - ${apiResponse.msg}`
            );
        }

        // Адаптируем ответ к формату, похожему на KieAiUnifiedTaskResponse
        // Определяем state на основе наличия данных в response
        let state: 'waiting' | 'queuing' | 'generating' | 'success' | 'fail' =
            'generating';
        if (
            apiResponse.data.response?.resultUrls &&
            apiResponse.data.response.resultUrls.length > 0
        ) {
            state = 'success';
        } else if (apiResponse.data.completeTime) {
            // Если есть completeTime, но нет resultUrls, возможно ошибка
            state = 'fail';
        }

        return {
            code: apiResponse.code,
            msg: apiResponse.msg,
            data: {
                taskId: apiResponse.data.taskId,
                state,
                resultJson: apiResponse.data.response
                    ? JSON.stringify(apiResponse.data.response)
                    : undefined,
                response: apiResponse.data.response,
            },
        };
    }

    return {
        name: 'kieai-veo3',
        isAsync: true,

        async generate(params: GenerateParams): Promise<TaskCreatedResult> {
            const result = await createVeo3Task(params);

            return {
                taskId: result.data.taskId,
                status: 'pending',
            };
        },

        async checkTaskStatus(taskId: string): Promise<TaskStatusResult> {
            const result = await getTaskResultFromAPI(taskId);

            const taskData = result.data;
            const mappedStatus =
                KIEAI_STATUS_MAP[taskData.state || 'pending'] || 'pending';

            // Извлекаем URLs из response
            let resultUrls: string[] = [];
            if (taskData.response?.resultUrls) {
                resultUrls = taskData.response.resultUrls;
            } else if (taskData.resultJson) {
                try {
                    const resultData = JSON.parse(taskData.resultJson) as {
                        resultUrls?: string[];
                        videoUrl?: string;
                    };
                    resultUrls =
                        resultData.resultUrls ||
                        (resultData.videoUrl ? [resultData.videoUrl] : []);
                } catch (error) {
                    console.error(
                        '[Kie.ai Veo 3.1] Ошибка парсинга resultJson:',
                        error
                    );
                }
            }

            return {
                status: mappedStatus,
                url: resultUrls[0],
                error:
                    taskData.state === 'fail'
                        ? taskData.failMsg || 'Неизвестная ошибка'
                        : undefined,
            };
        },

        async getTaskResult(taskId: string): Promise<SavedFileInfo[]> {
            const result = await getTaskResultFromAPI(taskId);

            const taskData = result.data;

            if (taskData.state !== 'success') {
                throw new Error(
                    `Задача Kie.ai Veo 3.1 не завершена: state=${taskData.state}, error=${taskData.failMsg}`
                );
            }

            const files: SavedFileInfo[] = [];
            const downloadedUrls = new Set<string>();

            // Извлекаем URLs из response
            let resultUrls: string[] = [];
            if (taskData.response?.resultUrls) {
                resultUrls = taskData.response.resultUrls;
            } else if (taskData.resultJson) {
                try {
                    const resultData = JSON.parse(taskData.resultJson) as {
                        resultUrls?: string[];
                        videoUrl?: string;
                    };
                    resultUrls =
                        resultData.resultUrls ||
                        (resultData.videoUrl ? [resultData.videoUrl] : []);
                } catch (error) {
                    console.error(
                        '[Kie.ai Veo 3.1] Ошибка парсинга resultJson:',
                        error
                    );
                }
            }

            // Скачиваем файлы
            for (const url of resultUrls) {
                if (!downloadedUrls.has(url)) {
                    console.log('[Kie.ai Veo 3.1] Скачивание файла:', url);
                    const savedFile = await saveFileFromUrl(url);
                    files.push(savedFile);
                    downloadedUrls.add(url);
                }
            }

            if (files.length === 0) {
                throw new Error(
                    `Не удалось получить результат задачи Kie.ai Veo 3.1: taskId=${taskId}`
                );
            }

            console.log(
                `[Kie.ai Veo 3.1] Файлы сохранены: ${files.length} файлов`
            );
            return files;
        },
    };
}
