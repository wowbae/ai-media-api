// Сервис для работы с OpenRouter API
import { MediaModel, RequestStatus, Prisma } from '@prisma/client';
import { prisma } from 'prisma/client';
import { MEDIA_MODELS, openRouterConfig, MediaModelKey } from './config';
import { saveBase64File, saveFileFromUrl, SavedFileInfo } from './file.service';
import { notifyTelegramGroup } from './telegram.notifier';
import type {
    OpenRouterMessage,
    OpenRouterContent,
    GeminiImagePart,
} from './interfaces';

// Преобразование MediaModel enum в ключ конфига
function getModelConfig(
    model: MediaModel
): (typeof MEDIA_MODELS)[MediaModelKey] {
    return MEDIA_MODELS[model as MediaModelKey];
}

// Создание сообщения для OpenRouter
function createOpenRouterMessage(
    prompt: string,
    inputImages?: string[]
): OpenRouterMessage[] {
    const content: OpenRouterContent[] = [{ type: 'text', text: prompt }];

    // Добавляем входные изображения для image-to-image
    if (inputImages && inputImages.length > 0) {
        for (const imageUrl of inputImages) {
            content.push({
                type: 'image_url',
                image_url: { url: imageUrl },
            });
        }
    }

    return [
        {
            role: 'user',
            content,
        },
    ];
}

// Основная функция генерации медиа через OpenRouter
export async function generateMedia(
    requestId: number,
    prompt: string,
    model: MediaModel,
    inputFiles: string[] = [],
    format?: '9:16' | '16:9',
    quality?: '1k' | '2k' | '4k'
): Promise<SavedFileInfo[]> {
    const modelConfig = getModelConfig(model);

    // Обновляем статус на PROCESSING
    await prisma.mediaRequest.update({
        where: { id: requestId },
        data: { status: RequestStatus.PROCESSING },
    });

    try {
        // Валидация промпта
        if (prompt.length > modelConfig.maxPromptLength) {
            throw new Error(
                `Промпт превышает максимальную длину ${modelConfig.maxPromptLength} символов`
            );
        }

        // Формируем запрос к OpenRouter
        const messages = createOpenRouterMessage(prompt, inputFiles);

        // Для Gemini 3 Pro Image Preview нужен параметр modalities
        const requestBody: Record<string, unknown> = {
            model: modelConfig.id,
            messages,
            ...(model === 'NANO_BANANA' && {
                // Согласно документации OpenRouter, для Gemini нужен параметр modalities
                modalities: ['image', 'text'],
                // Добавляем настройки формата и качества для генерации изображений
                ...(format && { aspect_ratio: format }),
                ...(quality &&
                    (() => {
                        // Вычисляем разрешение с учетом формата и качества
                        let width: number;
                        let height: number;

                        if (format === '9:16') {
                            // Вертикальный формат
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
                        } else if (format === '16:9') {
                            // Горизонтальный формат
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
                            // Квадратный формат по умолчанию
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

                        return { resolution: `${width}x${height}` };
                    })()),
            }),
        };

        console.log('[OpenRouter] Отправка запроса:', {
            model: modelConfig.id,
            messagesCount: messages.length,
            hasModalities: !!(requestBody as any).modalities,
            requestBody: JSON.stringify(requestBody, null, 2).substring(0, 500),
        });

        const response = await fetch(
            `${openRouterConfig.baseURL}/chat/completions`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${openRouterConfig.apiKey}`,
                    ...openRouterConfig.defaultHeaders,
                },
                body: JSON.stringify(requestBody),
            }
        );

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(
                `OpenRouter API error: ${response.status} - ${errorData}`
            );
        }

        const data = await response.json();
        const savedFiles: SavedFileInfo[] = [];

        console.log(
            `[OpenRouter] Получен ответ для requestId=${requestId}, model=${model}`
        );
        console.log(
            `[OpenRouter] Структура ответа:`,
            JSON.stringify(data, null, 2).substring(0, 500)
        );

        // Парсим ответ в зависимости от модели
        if (model === 'NANO_BANANA') {
            // Gemini возвращает изображения в специальном формате
            const files = await parseGeminiImageResponse(data);
            savedFiles.push(...files);
            console.log(
                `[OpenRouter] Парсинг Gemini: найдено ${files.length} файлов`
            );
        } else if (model === 'KLING') {
            // Kling может возвращать URL или base64
            const files = await parseKlingResponse(data);
            savedFiles.push(...files);
            console.log(
                `[OpenRouter] Парсинг Kling: найдено ${files.length} файлов`
            );
        } else {
            // Общий парсинг для других моделей
            const files = await parseGenericResponse(data);
            savedFiles.push(...files);
            console.log(
                `[OpenRouter] Парсинг Generic: найдено ${files.length} файлов`
            );
        }

        if (savedFiles.length === 0) {
            console.error(
                '[OpenRouter] ❌ КРИТИЧЕСКАЯ ОШИБКА: Не удалось извлечь файлы из ответа API'
            );
            console.error(
                '[OpenRouter] Полный ответ API сохранен выше в логах [Gemini]'
            );
            // Не выбрасываем ошибку сразу, чтобы увидеть структуру ответа в логах
            // Но всё равно обновим статус на FAILED
            throw new Error(
                'Не удалось извлечь файлы из ответа API. Проверьте структуру ответа в логах сервера.'
            );
        }

        // Сохраняем файлы в БД
        const request = await prisma.mediaRequest.findUnique({
            where: { id: requestId },
            include: { chat: true },
        });

        // Удаляем дубликаты файлов по пути перед сохранением в БД
        const uniqueFiles = savedFiles.filter(
            (file, index, self) =>
                index === self.findIndex((f) => f.path === file.path)
        );

        if (uniqueFiles.length !== savedFiles.length) {
            console.log(
                `[OpenRouter] ⚠️ Обнаружены дубликаты: ${savedFiles.length} файлов, уникальных: ${uniqueFiles.length}`
            );
        }

        console.log(
            `[OpenRouter] Сохранение ${uniqueFiles.length} файлов в БД для requestId=${requestId}`
        );

        for (const file of uniqueFiles) {
            console.log(
                `[OpenRouter] Сохранение файла: ${file.filename}, path: ${file.path}, type: ${file.type}`
            );

            const mediaFile = await prisma.mediaFile.create({
                data: {
                    requestId,
                    type: file.type,
                    filename: file.filename,
                    path: file.path,
                    previewPath: file.previewPath,
                    size: file.size,
                    metadata: file.metadata as Prisma.InputJsonValue,
                },
            });

            console.log(`[OpenRouter] Файл сохранен в БД с id=${mediaFile.id}`);

            // Отправляем уведомление в Telegram
            if (request?.chat) {
                console.log(
                    `[OpenRouter] Отправка уведомления в Telegram для файла ${mediaFile.id}`
                );
                try {
                    const telegramResult = await notifyTelegramGroup(
                        mediaFile,
                        request.chat.name,
                        prompt
                    );
                    console.log(
                        `[OpenRouter] Telegram уведомление ${telegramResult ? 'отправлено' : 'не отправлено'}`
                    );
                } catch (telegramError) {
                    console.error(
                        `[OpenRouter] Ошибка отправки в Telegram:`,
                        telegramError
                    );
                    // Не прерываем выполнение если Telegram не работает
                }
            }
        }

        // Обновляем статус на COMPLETED
        await prisma.mediaRequest.update({
            where: { id: requestId },
            data: {
                status: RequestStatus.COMPLETED,
                completedAt: new Date(),
            },
        });

        console.log(
            `[OpenRouter] ✅ Генерация завершена для requestId=${requestId}, сохранено файлов: ${savedFiles.length}`
        );

        return savedFiles;
    } catch (error) {
        // Обновляем статус на FAILED
        const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
        console.error(
            `[OpenRouter] ❌ Ошибка генерации для requestId=${requestId}:`,
            errorMessage
        );
        await prisma.mediaRequest.update({
            where: { id: requestId },
            data: {
                status: RequestStatus.FAILED,
                errorMessage,
            },
        });
        throw error;
    }
}

// Парсинг ответа от Gemini (Nano Banana)
async function parseGeminiImageResponse(
    data: unknown
): Promise<SavedFileInfo[]> {
    const files: SavedFileInfo[] = [];

    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const responseData = data as any;

        // Логируем полную структуру ответа для отладки
        console.log('[Gemini] ========== ПОЛНАЯ СТРУКТУРА ОТВЕТА ==========');
        console.log('[Gemini] JSON:', JSON.stringify(responseData, null, 2));
        console.log('[Gemini] ===========================================');

        console.log('[Gemini] Парсинг ответа, структура:', {
            hasChoices: !!responseData.choices,
            choicesCount: responseData.choices?.length || 0,
            hasData: !!responseData.data,
            dataType: Array.isArray(responseData.data)
                ? 'array'
                : typeof responseData.data,
            topLevelKeys: Object.keys(responseData),
        });

        const choices = responseData.choices || [];

        for (const choice of choices) {
            const message = choice.message;
            const content = message?.content;
            const images = message?.images; // Для Gemini 3 Pro Image Preview изображения в message.images

            console.log('[Gemini] Обработка choice:', {
                hasContent: !!content,
                hasImages: !!images,
                imagesCount: Array.isArray(images) ? images.length : 0,
                contentType: Array.isArray(content) ? 'array' : typeof content,
                contentLength: Array.isArray(content)
                    ? content.length
                    : content?.length,
            });

            // Согласно документации OpenRouter, для Gemini 3 Pro Image Preview
            // изображения находятся в message.images массиве
            if (Array.isArray(images) && images.length > 0) {
                console.log(
                    `[Gemini] ✅ Найдено ${images.length} изображений в message.images`
                );
                for (let i = 0; i < images.length; i++) {
                    const image = images[i];
                    const imageUrl = image?.image_url?.url;

                    console.log(`[Gemini] Обработка изображения ${i + 1}:`, {
                        hasImageUrl: !!imageUrl,
                        imageUrlType: typeof imageUrl,
                        imageUrlPreview: imageUrl
                            ? imageUrl.substring(0, 50)
                            : 'нет',
                    });

                    if (imageUrl) {
                        // imageUrl это Base64 data URL вида "data:image/png;base64,..."
                        if (imageUrl.startsWith('data:image')) {
                            const [header, base64] = imageUrl.split(',');
                            const mimeMatch = header.match(/data:([^;]+)/);
                            const mimeType = mimeMatch
                                ? mimeMatch[1]
                                : 'image/png';
                            console.log(
                                `[Gemini] ✅ Сохранение изображения ${i + 1} из data URL, mimeType: ${mimeType}`
                            );
                            const savedFile = await saveBase64File(
                                base64,
                                mimeType
                            );
                            files.push(savedFile);
                            console.log(
                                `[Gemini] ✅ Файл сохранен: ${savedFile.filename}`
                            );
                        } else if (imageUrl.startsWith('http')) {
                            console.log(
                                `[Gemini] ✅ Сохранение изображения ${i + 1} из URL: ${imageUrl}`
                            );
                            const savedFile = await saveFileFromUrl(imageUrl);
                            files.push(savedFile);
                            console.log(
                                `[Gemini] ✅ Файл сохранен: ${savedFile.filename}`
                            );
                        }
                    }
                }
                // Если файлы найдены в message.images, не проверяем другие места для этого choice
                continue;
            }

            // Контент может быть массивом частей (multimodal) - оставляем как fallback для других форматов
            if (Array.isArray(content)) {
                console.log(
                    '[Gemini] Файлы не найдены в message.images, проверяем content как массив'
                );
                console.log(
                    '[Gemini] Content - массив, элементов:',
                    content.length
                );
                for (let i = 0; i < content.length; i++) {
                    const part = content[i] as GeminiImagePart;
                    console.log(`[Gemini] Part ${i}:`, {
                        hasInlineData: !!part.inlineData,
                        hasData: !!part.inlineData?.data,
                        hasText: !!part.text,
                        mimeType: part.inlineData?.mimeType,
                    });

                    if (part.inlineData?.data) {
                        console.log(
                            `[Gemini] ✅ Сохранение файла из part ${i}, mimeType: ${part.inlineData.mimeType || 'image/png'}`
                        );
                        const savedFile = await saveBase64File(
                            part.inlineData.data,
                            part.inlineData.mimeType || 'image/png'
                        );
                        files.push(savedFile);
                        console.log(
                            `[Gemini] ✅ Файл сохранен: ${savedFile.filename}`
                        );
                    }
                }
            } else if (typeof content === 'string') {
                console.log(
                    '[Gemini] Файлы не найдены в message.images, проверяем content как строку'
                );
                console.log(
                    '[Gemini] Content - строка, длина:',
                    content.length
                );
                console.log(
                    '[Gemini] Первые 200 символов:',
                    content.substring(0, 200)
                );

                // Проверяем, может это base64 в строке или URL
                if (content.startsWith('data:image')) {
                    const [header, base64] = content.split(',');
                    const mimeMatch = header.match(/data:([^;]+)/);
                    const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
                    console.log(
                        `[Gemini] ✅ Сохранение файла из data URL, mimeType: ${mimeType}`
                    );
                    const savedFile = await saveBase64File(base64, mimeType);
                    files.push(savedFile);
                    console.log(
                        `[Gemini] ✅ Файл сохранен: ${savedFile.filename}`
                    );
                } else if (content.startsWith('http')) {
                    console.log(
                        `[Gemini] ✅ Сохранение файла из URL: ${content}`
                    );
                    const savedFile = await saveFileFromUrl(content);
                    files.push(savedFile);
                    console.log(
                        `[Gemini] ✅ Файл сохранен: ${savedFile.filename}`
                    );
                } else if (
                    content.length > 100 &&
                    /^[A-Za-z0-9+/=]+$/.test(content)
                ) {
                    // Возможно это чистый base64 без префикса data URL
                    console.log(
                        '[Gemini] ✅ Похоже на чистый base64 без префикса, пробуем сохранить'
                    );
                    try {
                        // Проверяем, что это валидный base64
                        Buffer.from(content, 'base64');
                        const savedFile = await saveBase64File(
                            content,
                            'image/png'
                        );
                        files.push(savedFile);
                        console.log(
                            `[Gemini] ✅ Файл сохранен из чистого base64: ${savedFile.filename}`
                        );
                    } catch (e) {
                        console.warn(
                            '[Gemini] ⚠️ Не удалось декодировать как base64:',
                            e
                        );
                    }
                } else {
                    console.warn(
                        '[Gemini] ⚠️ Строка content не распознана как data URL, URL или base64'
                    );
                    console.warn(
                        '[Gemini] Длина:',
                        content.length,
                        'Превью:',
                        content.substring(0, 100)
                    );
                }
            } else if (content && typeof content === 'object') {
                console.log(
                    '[Gemini] Файлы не найдены в message.images, проверяем content как объект'
                );
                // Возможно, контент - объект с данными
                const contentObj = content as any;
                if (contentObj.inlineData?.data) {
                    console.log(
                        '[Gemini] ✅ Найден inlineData в объекте content'
                    );
                    const savedFile = await saveBase64File(
                        contentObj.inlineData.data,
                        contentObj.inlineData.mimeType || 'image/png'
                    );
                    files.push(savedFile);
                    console.log(
                        `[Gemini] ✅ Файл сохранен: ${savedFile.filename}`
                    );
                }
            }
        }

        // Проверяем альтернативную структуру ответа - когда response_format: { type: 'b64_json' }
        // В этом случае данные могут быть прямо в choices[].message.content как строка base64
        if (files.length === 0) {
            console.log(
                '[Gemini] Файлы не найдены в choices, проверяем альтернативные структуры'
            );

            // Проверяем responseData.data
            if (responseData.data) {
                console.log('[Gemini] Проверяем responseData.data');
                const dataArray = Array.isArray(responseData.data)
                    ? responseData.data
                    : [responseData.data];
                for (const item of dataArray) {
                    if (item.b64_json) {
                        console.log('[Gemini] ✅ Найден b64_json в data');
                        const savedFile = await saveBase64File(
                            item.b64_json,
                            'image/png'
                        );
                        files.push(savedFile);
                    } else if (item.url) {
                        console.log('[Gemini] ✅ Найден url в data:', item.url);
                        const savedFile = await saveFileFromUrl(item.url);
                        files.push(savedFile);
                    }
                }
            }

            // Проверяем прямую структуру с base64 в корне ответа
            if (files.length === 0 && responseData.b64_json) {
                console.log('[Gemini] ✅ Найден b64_json в корне ответа');
                const savedFile = await saveBase64File(
                    responseData.b64_json,
                    'image/png'
                );
                files.push(savedFile);
            }

            // Проверяем каждый choice более тщательно
            if (files.length === 0 && choices.length > 0) {
                console.log('[Gemini] Проверяем каждый choice детально');
                for (let i = 0; i < choices.length; i++) {
                    const choice = choices[i];
                    console.log(`[Gemini] Choice ${i}:`, {
                        hasMessage: !!choice.message,
                        messageKeys: choice.message
                            ? Object.keys(choice.message)
                            : [],
                        contentType: typeof choice.message?.content,
                        isContentArray: Array.isArray(choice.message?.content),
                    });

                    // Проверяем все поля choice на наличие base64 или URL
                    const choiceString = JSON.stringify(choice);
                    const base64Match = choiceString.match(
                        /"data:image\/[^"]+;base64,([^"]+)"/
                    );
                    if (base64Match) {
                        console.log(
                            '[Gemini] ✅ Найден base64 в choice через regex'
                        );
                        const mimeMatch =
                            choiceString.match(/data:image\/([^;]+)/);
                        const mimeType = mimeMatch
                            ? `image/${mimeMatch[1]}`
                            : 'image/png';
                        const savedFile = await saveBase64File(
                            base64Match[1],
                            mimeType
                        );
                        files.push(savedFile);
                    }
                }
            }
        }

        if (files.length === 0) {
            console.error(
                '[Gemini] ❌ Файлы не найдены в ответе после всех проверок'
            );
            console.error(
                '[Gemini] Полная структура ответа:',
                JSON.stringify(responseData, null, 2)
            );
        }
    } catch (error) {
        console.error('[Gemini] ❌ Ошибка парсинга ответа Gemini:', error);
    }

    console.log(`[Gemini] Парсинг завершен, найдено файлов: ${files.length}`);
    return files;
}

// Парсинг ответа от Kling
async function parseKlingResponse(data: unknown): Promise<SavedFileInfo[]> {
    const files: SavedFileInfo[] = [];

    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const responseData = data as any;

        // Kling обычно возвращает URL к сгенерированному контенту
        if (responseData.data?.url) {
            const savedFile = await saveFileFromUrl(responseData.data.url);
            files.push(savedFile);
        }

        // Или массив результатов
        if (Array.isArray(responseData.data)) {
            for (const item of responseData.data) {
                if (item.url) {
                    const savedFile = await saveFileFromUrl(item.url);
                    files.push(savedFile);
                }
            }
        }

        // Проверяем choices структуру
        const choices = responseData.choices || [];
        for (const choice of choices) {
            const content = choice.message?.content;
            if (typeof content === 'string' && content.startsWith('http')) {
                const savedFile = await saveFileFromUrl(content);
                files.push(savedFile);
            }
        }
    } catch (error) {
        console.error('Ошибка парсинга ответа Kling:', error);
    }

    return files;
}

// Общий парсинг для других моделей
async function parseGenericResponse(data: unknown): Promise<SavedFileInfo[]> {
    const files: SavedFileInfo[] = [];

    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const responseData = data as any;

        // Стандартная структура OpenAI-совместимого API
        if (responseData.data) {
            for (const item of responseData.data) {
                if (item.b64_json) {
                    const savedFile = await saveBase64File(
                        item.b64_json,
                        'image/png'
                    );
                    files.push(savedFile);
                } else if (item.url) {
                    const savedFile = await saveFileFromUrl(item.url);
                    files.push(savedFile);
                }
            }
        }

        // Проверяем choices
        const choices = responseData.choices || [];
        for (const choice of choices) {
            const content = choice.message?.content;
            if (typeof content === 'string') {
                // Ищем URL в тексте
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
        console.error('Ошибка парсинга generic ответа:', error);
    }

    return files;
}

// Получение доступных моделей
export function getAvailableModels(): Array<{
    key: string;
    name: string;
    types: readonly string[];
    supportsImageInput: boolean;
}> {
    return Object.entries(MEDIA_MODELS).map(([key, config]) => ({
        key,
        name: config.name,
        types: config.types,
        supportsImageInput: config.supportsImageInput,
    }));
}
