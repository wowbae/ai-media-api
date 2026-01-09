// LaoZhang провайдер для работы с моделями через LaoZhang API
// Используется для Nano Banana Pro (изображения), Sora 2 и Veo 3.1 (видео)
import type {
    MediaProvider,
    GenerateParams,
    TaskCreatedResult,
    TaskStatusResult,
} from '../interfaces';
import { PROVIDER_STATUS_MAP } from '../interfaces';
import type { SavedFileInfo } from '../../file.service';
import { saveBase64File, saveFileFromUrl } from '../../file.service';
import { MEDIA_MODELS } from '../../config';
import type {
    LaoZhangConfig,
    LaoZhangMessage,
    LaoZhangContent,
    LaoZhangImageResponse,
    LaoZhangVideoCreateResponse,
    AspectRatio,
    Quality,
} from './interfaces';

// Создание сообщения в формате LaoZhang (OpenAI-совместимый)
function createLaoZhangMessage(
    prompt: string,
    inputImages?: string[]
): LaoZhangMessage[] {
    const content: LaoZhangContent[] = [{ type: 'text', text: prompt }];

    if (inputImages && inputImages.length > 0) {
        for (const imageUrl of inputImages) {
            content.push({
                type: 'image_url',
                image_url: { url: imageUrl },
            });
        }
    }

    return [{ role: 'user', content }];
}

// Парсинг ответа от Nano Banana Pro (изображения)
async function parseImageResponse(
    data: LaoZhangImageResponse
): Promise<SavedFileInfo[]> {
    const files: SavedFileInfo[] = [];

    try {
        console.log('[LaoZhang] Парсинг ответа изображения');

        const choices = data.choices || [];

        for (const choice of choices) {
            const message = choice.message;
            const images = message?.images;

            // Изображения в message.images массиве
            if (Array.isArray(images) && images.length > 0) {
                console.log(
                    `[LaoZhang] ✅ Найдено ${images.length} изображений`
                );
                for (const image of images) {
                    const imageUrl = image?.image_url?.url;

                    if (imageUrl) {
                        if (imageUrl.startsWith('data:image')) {
                            const [header, base64] = imageUrl.split(',');
                            const mimeMatch = header.match(/data:([^;]+)/);
                            const mimeType = mimeMatch
                                ? mimeMatch[1]
                                : 'image/png';
                            const savedFile = await saveBase64File(
                                base64,
                                mimeType
                            );
                            files.push(savedFile);
                        } else if (imageUrl.startsWith('http')) {
                            const savedFile = await saveFileFromUrl(imageUrl);
                            files.push(savedFile);
                        }
                    }
                }
                continue;
            }

            // Fallback: изображение в content как URL или base64
            const content = message?.content;
            if (typeof content === 'string') {
                if (content.startsWith('data:image')) {
                    const [header, base64] = content.split(',');
                    const mimeMatch = header.match(/data:([^;]+)/);
                    const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
                    const savedFile = await saveBase64File(base64, mimeType);
                    files.push(savedFile);
                } else if (content.startsWith('http')) {
                    const savedFile = await saveFileFromUrl(content);
                    files.push(savedFile);
                }
            }
        }
    } catch (error) {
        console.error('[LaoZhang] ❌ Ошибка парсинга изображения:', error);
    }

    return files;
}

// Вспомогательная функция для расчёта разрешения
function calculateResolution(
    aspectRatio?: AspectRatio,
    quality?: Quality
): string | null {
    if (!quality) return null;

    let width: number;
    let height: number;

    if (aspectRatio === '9:16') {
        if (quality === '1k') {
            width = 1024;
            height = 1820;
        } else if (quality === '2k') {
            width = 2048;
            height = 3640;
        } else {
            width = 4096;
            height = 7280;
        }
    } else if (aspectRatio === '16:9') {
        if (quality === '1k') {
            width = 1820;
            height = 1024;
        } else if (quality === '2k') {
            width = 3640;
            height = 2048;
        } else {
            width = 7280;
            height = 4096;
        }
    } else {
        // 1:1 по умолчанию
        if (quality === '1k') {
            width = 1024;
            height = 1024;
        } else if (quality === '2k') {
            width = 2048;
            height = 2048;
        } else {
            width = 4096;
            height = 4096;
        }
    }

    return `${width}x${height}`;
}

// Провайдер для изображений (синхронный) - Nano Banana Pro
export function createLaoZhangImageProvider(
    config: LaoZhangConfig
): MediaProvider {
    const { apiKey, baseURL } = config;

    return {
        name: 'laozhang-image',
        isAsync: false,

        async generate(params: GenerateParams): Promise<SavedFileInfo[]> {
            const modelConfig = MEDIA_MODELS[params.model as string];
            if (!modelConfig || modelConfig.provider !== 'laozhang') {
                throw new Error(
                    `Модель ${params.model} не поддерживается LaoZhang`
                );
            }

            console.log('[LaoZhang Image] 🚀 Генерация:', {
                requestId: params.requestId,
                model: params.model,
                prompt: params.prompt.substring(0, 50),
            });

            // Валидация промпта
            if (params.prompt.length > modelConfig.maxPromptLength) {
                throw new Error(
                    `Промпт превышает максимальную длину ${modelConfig.maxPromptLength} символов`
                );
            }

            const messages = createLaoZhangMessage(
                params.prompt,
                params.inputFiles
            );

            // Формируем тело запроса
            const requestBody: Record<string, unknown> = {
                model: modelConfig.id,
                messages,
                modalities: ['image', 'text'],
            };

            if (params.aspectRatio) {
                requestBody.aspect_ratio = params.aspectRatio;
            }

            if (params.quality) {
                const resolution = calculateResolution(
                    params.aspectRatio as AspectRatio,
                    params.quality
                );
                if (resolution) {
                    requestBody.resolution = resolution;
                }
            }

            console.log('[LaoZhang Image] Отправка запроса:', {
                model: modelConfig.id,
                messagesCount: messages.length,
            });

            const response = await fetch(`${baseURL}/v1/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(
                    `LaoZhang API error: ${response.status} - ${errorData}`
                );
            }

            const data = (await response.json()) as LaoZhangImageResponse;
            const savedFiles = await parseImageResponse(data);

            // Удаляем дубликаты
            const uniqueFiles = savedFiles.filter(
                (file, index, self) =>
                    index === self.findIndex((f) => f.path === file.path)
            );

            if (uniqueFiles.length === 0) {
                throw new Error(
                    'Не удалось извлечь файлы из ответа API. Проверьте структуру ответа.'
                );
            }

            console.log(
                `[LaoZhang Image] ✅ Генерация завершена: ${uniqueFiles.length} файлов`
            );

            return uniqueFiles;
        },
    };
}

// Провайдер для видео (асинхронный) - Sora 2, Veo 3.1
export function createLaoZhangVideoProvider(
    config: LaoZhangConfig
): MediaProvider {
    const { apiKey, baseURL } = config;

    // Хранилище task_id для отслеживания статуса
    const taskIdMap = new Map<string, string>();

    async function createVideoTask(
        params: GenerateParams
    ): Promise<{ taskId: string; status: 'pending' | 'processing' }> {
        const modelConfig = MEDIA_MODELS[params.model as string];
        if (!modelConfig || modelConfig.provider !== 'laozhang') {
            throw new Error(`Модель ${params.model} не поддерживается LaoZhang`);
        }

        const messages = createLaoZhangMessage(
            params.prompt,
            params.inputFiles
        );

        const requestBody: Record<string, unknown> = {
            model: modelConfig.id,
            messages,
        };

        // Добавляем aspect_ratio для видео
        if (params.aspectRatio) {
            requestBody.aspect_ratio = params.aspectRatio;
        }

        console.log('[LaoZhang Video] Создание задачи:', {
            model: modelConfig.id,
            prompt: params.prompt.substring(0, 50),
            hasImages: !!(params.inputFiles && params.inputFiles.length > 0),
        });

        const response = await fetch(`${baseURL}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
                `LaoZhang API error: ${response.status} - ${errorText}`
            );
        }

        const data = (await response.json()) as LaoZhangVideoCreateResponse;

        // Извлекаем task_id из ответа
        let taskId = data.task_id || data.id;

        // Пытаемся извлечь task_id из content, если он там
        if (!taskId && data.choices?.[0]?.message?.content) {
            const content = data.choices[0].message.content;
            const taskIdMatch = content.match(/task_id[:\s]*([a-zA-Z0-9_-]+)/i);
            if (taskIdMatch) {
                taskId = taskIdMatch[1];
            }
        }

        if (!taskId) {
            throw new Error('Не удалось получить task_id от API');
        }

        console.log('[LaoZhang Video] Задача создана:', {
            taskId,
        });

        return {
            taskId,
            status: 'pending',
        };
    }

    async function checkVideoStatus(
        taskId: string
    ): Promise<TaskStatusResult> {
        const response = await fetch(`${baseURL}/v1/video/status`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({ task_id: taskId }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
                `LaoZhang API error: ${response.status} - ${errorText}`
            );
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = (await response.json()) as any;

        // Маппинг статусов
        let status: TaskStatusResult['status'] = 'pending';
        if (data.status === 'completed' || data.status === 'done') {
            status = 'done';
        } else if (data.status === 'processing') {
            status = 'processing';
        } else if (data.status === 'failed') {
            status = 'failed';
        }

        console.log('[LaoZhang Video] Статус задачи:', {
            taskId,
            status: data.status,
            mappedStatus: status,
            hasUrl: !!data.result?.url,
        });

        return {
            status,
            url: data.result?.url || undefined,
            error: data.error || undefined,
        };
    }

    return {
        name: 'laozhang-video',
        isAsync: true,

        async generate(params: GenerateParams): Promise<TaskCreatedResult> {
            const result = await createVideoTask(params);

            return {
                taskId: result.taskId,
                status: result.status,
            };
        },

        async checkTaskStatus(taskId: string): Promise<TaskStatusResult> {
            return await checkVideoStatus(taskId);
        },

        async getTaskResult(taskId: string): Promise<SavedFileInfo[]> {
            const status = await checkVideoStatus(taskId);

            if (status.status !== 'done' || !status.url) {
                throw new Error(
                    `Задача не завершена: status=${status.status}`
                );
            }

            console.log('[LaoZhang Video] Скачивание результата:', {
                taskId,
                url: status.url,
            });

            // Скачиваем и сохраняем файл
            const savedFile = await saveFileFromUrl(status.url);

            console.log('[LaoZhang Video] Файл сохранён:', savedFile.filename);

            return [savedFile];
        },
    };
}

// Универсальный провайдер, который определяет тип модели и делегирует нужному
export function createLaoZhangProvider(
    config: LaoZhangConfig
): MediaProvider {
    const imageProvider = createLaoZhangImageProvider(config);
    const videoProvider = createLaoZhangVideoProvider(config);

    return {
        name: 'laozhang',
        isAsync: true, // Общий провайдер считается async, так как видео модели async

        async generate(
            params: GenerateParams
        ): Promise<SavedFileInfo[] | TaskCreatedResult> {
            const modelConfig = MEDIA_MODELS[params.model as string];
            if (!modelConfig) {
                throw new Error(`Неизвестная модель: ${params.model}`);
            }

            // Для изображений - синхронный запрос
            if (modelConfig.types.includes('IMAGE')) {
                return await imageProvider.generate(params);
            }

            // Для видео - асинхронный запрос
            return await videoProvider.generate(params);
        },

        async checkTaskStatus(taskId: string): Promise<TaskStatusResult> {
            // Только для видео провайдера
            return await videoProvider.checkTaskStatus!(taskId);
        },

        async getTaskResult(taskId: string): Promise<SavedFileInfo[]> {
            // Только для видео провайдера
            return await videoProvider.getTaskResult!(taskId);
        },
    };
}
