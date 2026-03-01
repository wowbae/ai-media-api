// OpenRouter провайдер для работы с моделями через OpenRouter API
// Используется для Nano Banana (Gemini) и других моделей
import type { MediaProvider, GenerateParams } from '../interfaces';
import type { SavedFileInfo } from '../../file.service';
import { saveBase64File, saveFileFromUrl } from '../../file.service';
import {
    getModelsByProvider,
    getModelConfig,
    type MediaModelConfig,
} from '../../config';
import type {
    OpenRouterConfig,
    OpenRouterMessage,
    OpenRouterContent,
    GeminiImagePart,
    AspectRatio,
    Quality,
} from './interfaces';
import { mapToStandardQuality } from '../utils';

// Создание сообщения в формате OpenRouter
function createOpenRouterMessage(
    prompt: string,
    inputImages?: string[]
): OpenRouterMessage[] {
    const content: OpenRouterContent[] = [{ type: 'text', text: prompt }];

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

// Парсинг ответа от Gemini (Nano Banana)
async function parseGeminiImageResponse(
    data: unknown
): Promise<SavedFileInfo[]> {
    const files: SavedFileInfo[] = [];

    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const responseData = data as any;

        console.log('[OpenRouter] Парсинг Gemini ответа');

        const choices = responseData.choices || [];

        for (const choice of choices) {
            const message = choice.message;
            const content = message?.content;
            const images = message?.images;

            // Согласно документации OpenRouter, для Gemini 3 Pro Image Preview
            // изображения находятся в message.images массиве
            if (Array.isArray(images) && images.length > 0) {
                console.log(
                    `[OpenRouter] ✅ Найдено ${images.length} изображений в message.images`
                );
                for (let i = 0; i < images.length; i++) {
                    const image = images[i];
                    const imageUrl = image?.image_url?.url;

                    if (imageUrl) {
                        if (imageUrl.startsWith('data:image')) {
                            const [header, base64] = imageUrl.split(',');
                            const mimeMatch = header.match(/data:([^;]+)/);
                            const mimeType = mimeMatch
                                ? mimeMatch[1]
                                : 'image/png';
                            const savedFile = await saveBase64File(base64, mimeType, {
                                deferImgbb: true,
                            });
                            files.push(savedFile);
                        } else if (imageUrl.startsWith('http')) {
                            const savedFile = await saveFileFromUrl(imageUrl);
                            files.push(savedFile);
                        }
                    }
                }
                continue;
            }

            // Fallback для массива контента
            if (Array.isArray(content)) {
                for (const part of content as GeminiImagePart[]) {
                    if (part.inlineData?.data) {
                        const savedFile = await saveBase64File(
                            part.inlineData.data,
                            part.inlineData.mimeType || 'image/png',
                            { deferImgbb: true }
                        );
                        files.push(savedFile);
                    }
                }
            } else if (typeof content === 'string') {
                if (content.startsWith('data:image')) {
                    const [header, base64] = content.split(',');
                    const mimeMatch = header.match(/data:([^;]+)/);
                    const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
                    const savedFile = await saveBase64File(base64, mimeType, {
                            deferImgbb: true,
                        });
                    files.push(savedFile);
                } else if (content.startsWith('http')) {
                    const savedFile = await saveFileFromUrl(content);
                    files.push(savedFile);
                }
            }
        }

        // Альтернативные структуры ответа
        if (files.length === 0 && responseData.data) {
            const dataArray = Array.isArray(responseData.data)
                ? responseData.data
                : [responseData.data];
            for (const item of dataArray) {
                if (item.b64_json) {
                    const savedFile = await saveBase64File(
                        item.b64_json,
                        'image/png',
                        { deferImgbb: true }
                    );
                    files.push(savedFile);
                } else if (item.url) {
                    const savedFile = await saveFileFromUrl(item.url);
                    files.push(savedFile);
                }
            }
        }
    } catch (error) {
        console.error('[OpenRouter] ❌ Ошибка парсинга Gemini:', error);
    }

    return files;
}

// Общий парсинг для других моделей
async function parseGenericResponse(data: unknown): Promise<SavedFileInfo[]> {
    const files: SavedFileInfo[] = [];

    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const responseData = data as any;

        if (responseData.data) {
            for (const item of responseData.data) {
                if (item.b64_json) {
                    const savedFile = await saveBase64File(
                        item.b64_json,
                        'image/png',
                        { deferImgbb: true }
                    );
                    files.push(savedFile);
                } else if (item.url) {
                    const savedFile = await saveFileFromUrl(item.url);
                    files.push(savedFile);
                }
            }
        }

        const choices = responseData.choices || [];
        for (const choice of choices) {
            const content = choice.message?.content;
            if (typeof content === 'string') {
                const urlMatch = content.match(
                    /https?:\/\/[^\s]+\.(png|jpg|jpeg|webp|gif|mp4|webm)/gi
                );
                if (urlMatch) {
                    for (const url of urlMatch) {
                        const savedFile = await saveFileFromUrl(url);
                        files.push(savedFile);
                    }
                }
            }
        }
    } catch (error) {
        console.error('[OpenRouter] ❌ Ошибка парсинга generic:', error);
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

export function createOpenRouterProvider(
    config: OpenRouterConfig
): MediaProvider {
    const { apiKey, baseURL, defaultHeaders = {} } = config;

    return {
        name: 'openrouter',
        isAsync: false,

        async generate(params: GenerateParams): Promise<SavedFileInfo[]> {
            const modelConfig = getModelConfig(params.model as string);
            if (!modelConfig) {
                throw new Error(
                    `Модель ${params.model} не поддерживается OpenRouter`
                );
            }

            console.log('[OpenRouter] 🚀 Генерация:', {
                requestId: params.requestId,
                model: params.model,
                prompt: params.prompt.substring(0, 50),
            });

            // Валидация промпта
            const promptLimit = modelConfig.promptLimit ?? 5000;
            if (params.prompt.length > promptLimit) {
                throw new Error(
                    `Промпт превышает максимальную длину ${promptLimit} символов`
                );
            }

            const messages = createOpenRouterMessage(
                params.prompt,
                params.inputFiles
            );

            // Формируем тело запроса
            const requestBody: Record<string, unknown> = {
                model: modelConfig.id,
                messages,
            };

            // Специфичные параметры для NANO_BANANA_OPENROUTER (Gemini)
            if (params.model === 'NANO_BANANA_OPENROUTER') {
                requestBody.modalities = ['image', 'text'];

                if (params.aspectRatio) {
                    requestBody.aspect_ratio = params.aspectRatio;
                }

                if (params.quality) {
                    const standardQuality = mapToStandardQuality(params.quality);
                    const resolution = calculateResolution(
                        params.aspectRatio as AspectRatio,
                        standardQuality as Quality
                    );
                    if (resolution) {
                        requestBody.resolution = resolution;
                    }
                }
            }

            console.log('[OpenRouter] Отправка запроса:', {
                model: modelConfig.id,
                messagesCount: messages.length,
            });

            const response = await fetch(`${baseURL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                    ...defaultHeaders,
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(
                    `OpenRouter API error: ${response.status} - ${errorData}`
                );
            }

            const data = await response.json();
            let savedFiles: SavedFileInfo[] = [];

            // Парсим ответ в зависимости от модели
            if (params.model === 'NANO_BANANA_OPENROUTER') {
                savedFiles = await parseGeminiImageResponse(data);
            } else {
                savedFiles = await parseGenericResponse(data);
            }

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
                `[OpenRouter] ✅ Генерация завершена: ${uniqueFiles.length} файлов`
            );

            return uniqueFiles;
        },
    };
}

// Экспорт конфигов моделей для использования в getAvailableModels
export function getOpenRouterModels(): Record<string, MediaModelConfig> {
    return getModelsByProvider('openrouter');
}
