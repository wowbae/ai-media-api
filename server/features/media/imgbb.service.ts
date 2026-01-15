// Сервис для загрузки изображений на imgbb
// Используется для получения публичных URL изображений для GPTunnel API
import 'dotenv/config';

const IMGBB_API_URL = 'https://api.imgbb.com/1/upload';

// Константы для retry логики
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 2000; // 2 секунды минимум
const REQUEST_TIMEOUT = 30000; // 30 секунд
const PARALLEL_DELAY = 2000; // Задержка между файлами при пакетной загрузке (мс)

interface ImgbbResponse {
    data: {
        id: string;
        url: string; // Оригинальный URL без сжатия
        display_url: string; // Сжатая версия для отображения
        delete_url: string;
    };
    success: boolean;
    status: number;
}

interface ImgbbErrorResponse {
    status_code: number;
    error: {
        message: string;
        code: number;
    };
    status_txt: string;
}

// Кеш для ключей, чтобы не парсить env каждый раз
let cachedApiKeys: string[] | null = null;

/**
 * Сбрасывает кеш ключей (полезно при изменении env переменных)
 */
function resetImgbbApiKeysCache(): void {
    cachedApiKeys = null;
}

/**
 * Получает все доступные ключи imgbb из переменных окружения
 * Поддерживает оба формата:
 * - IMGBB_API_KEY, IMGBB_API_KEY_2, IMGBB_API_KEY_3 (с подчеркиванием)
 * - IMGBB_API_KEY, IMGBB_API_KEY2, IMGBB_API_KEY3 (без подчеркивания)
 */
function getImgbbApiKeys(): string[] {
    // Используем кеш, если он есть
    if (cachedApiKeys !== null) {
        return cachedApiKeys;
    }
    
    const keys: string[] = [];
    const foundKeys = new Set<string>(); // Для предотвращения дубликатов
    
    // Основной ключ
    const mainKey = process.env.IMGBB_API_KEY;
    if (mainKey && !foundKeys.has(mainKey)) {
        keys.push(mainKey);
        foundKeys.add(mainKey);
    }
    
    // Дополнительные ключи в двух форматах
    // Ищем последовательно: IMGBB_API_KEY_2/IMGBB_API_KEY2, затем IMGBB_API_KEY_3/IMGBB_API_KEY3 и т.д.
    let i = 2;
    let consecutiveEmpty = 0; // Счетчик последовательных пустых результатов
    
    while (consecutiveEmpty < 2 && i <= 100) {
        // Защита от бесконечного цикла
        let foundAtThisIndex = false;
        
        // Формат с подчеркиванием: IMGBB_API_KEY_2, IMGBB_API_KEY_3, ...
        const keyWithUnderscore = process.env[`IMGBB_API_KEY_${i}`];
        if (keyWithUnderscore && !foundKeys.has(keyWithUnderscore)) {
            keys.push(keyWithUnderscore);
            foundKeys.add(keyWithUnderscore);
            foundAtThisIndex = true;
        }
        
        // Формат без подчеркивания: IMGBB_API_KEY2, IMGBB_API_KEY3, ...
        const keyWithoutUnderscore = process.env[`IMGBB_API_KEY${i}`];
        if (keyWithoutUnderscore && !foundKeys.has(keyWithoutUnderscore)) {
            keys.push(keyWithoutUnderscore);
            foundKeys.add(keyWithoutUnderscore);
            foundAtThisIndex = true;
        }
        
        if (foundAtThisIndex) {
            consecutiveEmpty = 0; // Сброс счетчика, если нашли хотя бы один ключ
        } else {
            consecutiveEmpty++; // Увеличиваем счетчик, если не нашли ключей
        }
        
        i++;
    }
    
    const filteredKeys = keys.filter(Boolean);
    
    // Кешируем результат
    cachedApiKeys = filteredKeys;
    
    // Логируем количество найденных ключей (только при первом вызове)
    if (filteredKeys.length > 0) {
        console.log(`[imgbb] ✅ Найдено ${filteredKeys.length} ключей API`);
    }
    
    return filteredKeys;
}

/**
 * Проверяет, является ли ошибка ошибкой rate limit (код 100)
 */
function isRateLimitError(error: unknown, responseText?: string): boolean {
    if (responseText) {
        try {
            const errorData = JSON.parse(responseText) as ImgbbErrorResponse;
            const errorCode = errorData.error?.code;
            const statusCode = errorData.status_code;
            const message = (errorData.error?.message || '').toLowerCase();
            
            // Логируем для отладки
            if (errorCode === 100 || (statusCode === 400 && message.includes('rate limit'))) {
                console.log('[imgbb] Rate limit обнаружен в JSON ответе:', {
                    errorCode,
                    statusCode,
                    message: errorData.error?.message,
                });
                return true;
            }
        } catch (parseError) {
            // Если не удалось распарсить JSON, проверяем текст напрямую
            const lowerText = responseText.toLowerCase();
            if (lowerText.includes('rate limit')) {
                console.log('[imgbb] Rate limit обнаружен в тексте ответа (не JSON)');
                return true;
            }
        }
    }
    
    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        const isRateLimit = message.includes('rate limit') || message.includes('code: 100');
        if (isRateLimit) {
            console.log('[imgbb] Rate limit обнаружен в сообщении об ошибке:', message);
        }
        return isRateLimit;
    }
    
    return false;
}

/**
 * Проверяет, является ли ошибка ошибкой соединения, требующей retry
 */
function isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        const code = (error as any).code;

        // Проверяем на ECONNRESET и другие сетевые ошибки
        return (
            code === 'ECONNRESET' ||
            code === 'ECONNREFUSED' ||
            code === 'ETIMEDOUT' ||
            message.includes('socket connection was closed') ||
            message.includes('connection was closed') ||
            message.includes('network error') ||
            message.includes('fetch failed')
        );
    }
    return false;
}

/**
 * Создает fetch запрос с таймаутом
 */
async function fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeout: number
): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error(`Request timeout after ${timeout}ms`);
        }
        throw error;
    }
}

/**
 * Загружает одно изображение на imgbb с retry логикой и поддержкой ротации ключей
 * @param imageData - base64 строка (с или без data URL префикса) или Buffer
 * @param useDisplayUrl - если true, возвращает display_url (сжатая версия для превью), иначе url (оригинал)
 * @param retryCount - количество попыток ретрая
 * @param keyIndex - индекс текущего ключа в массиве ключей
 * @param triedKeys - множество индексов ключей, которые уже были попробованы (для предотвращения бесконечного цикла)
 * @returns публичный URL изображения
 */
export async function uploadToImgbb(
    imageData: string | Buffer,
    retryCount = 0,
    useDisplayUrl = false,
    keyIndex = 0,
    triedKeys: Set<number> = new Set()
): Promise<string> {
    const apiKeys = getImgbbApiKeys();
    
    if (apiKeys.length === 0) {
        throw new Error('IMGBB_API_KEY не настроен в .env');
    }
    
    // Используем ключ по индексу с циклическим перебором
    const actualKeyIndex = keyIndex % apiKeys.length;
    const currentKey = apiKeys[actualKeyIndex];
    
    // Добавляем текущий ключ в множество попробованных
    triedKeys.add(actualKeyIndex);

    let base64Data: string;

    if (Buffer.isBuffer(imageData)) {
        // Конвертируем Buffer в base64
        base64Data = imageData.toString('base64');
    } else {
        // Убираем data URL префикс если есть (data:image/...;base64,)
        if (imageData.includes(',')) {
            base64Data = imageData.split(',')[1];
        } else {
            base64Data = imageData;
        }
    }

    if (retryCount === 0) {
        console.log('[imgbb] Загрузка изображения...', {
            isBuffer: Buffer.isBuffer(imageData),
            base64Length: base64Data.length,
            keyIndex: actualKeyIndex + 1,
            totalKeys: apiKeys.length,
        });
    } else {
        console.log(`[imgbb] Повторная попытка загрузки (${retryCount}/${MAX_RETRIES})...`, {
            keyIndex: actualKeyIndex + 1,
            totalKeys: apiKeys.length,
            triedKeys: Array.from(triedKeys).map(i => i + 1),
        });
    }

    const formData = new FormData();
    formData.append('key', currentKey);
    formData.append('image', base64Data);

    try {
        const response = await fetchWithTimeout(
            IMGBB_API_URL,
            {
                method: 'POST',
                body: formData,
            },
            REQUEST_TIMEOUT
        );

        if (!response.ok) {
            const errorText = await response.text();
            const isRateLimit = isRateLimitError(null, errorText);
            
            console.error('[imgbb] Ошибка загрузки:', {
                status: response.status,
                error: errorText,
                retryCount,
                currentKeyIndex: actualKeyIndex + 1,
                totalKeys: apiKeys.length,
                isRateLimit,
                triedKeys: Array.from(triedKeys).map(i => i + 1),
            });
            
            // Если это rate limit и есть другие ключи, переключаемся на следующий
            if (isRateLimit && apiKeys.length > 1 && retryCount < MAX_RETRIES) {
                // Находим следующий непробованный ключ
                let nextKeyIndex = actualKeyIndex;
                let attempts = 0;
                
                do {
                    nextKeyIndex = (nextKeyIndex + 1) % apiKeys.length;
                    attempts++;
                    // Если все ключи уже попробованы, начинаем сначала
                    if (attempts >= apiKeys.length) {
                        triedKeys.clear(); // Сбрасываем множество попробованных ключей
                        nextKeyIndex = actualKeyIndex;
                        break;
                    }
                } while (triedKeys.has(nextKeyIndex) && attempts < apiKeys.length);
                
                const delay = Math.max(INITIAL_RETRY_DELAY, INITIAL_RETRY_DELAY * Math.pow(2, retryCount));
                
                console.warn(
                    `[imgbb] ⚠️ Rate limit достигнут на ключе ${actualKeyIndex + 1}, переключение на ключ ${nextKeyIndex + 1}/${apiKeys.length} через ${delay}ms...`
                );
                
                await new Promise((resolve) => setTimeout(resolve, delay));
                return uploadToImgbb(imageData, retryCount + 1, useDisplayUrl, nextKeyIndex, triedKeys);
            }
            
            throw new Error(`imgbb upload error: ${response.status} - ${errorText}`);
        }

        const result = (await response.json()) as ImgbbResponse;

        if (!result.success) {
            console.error('[imgbb] Неуспешный ответ:', result);
            throw new Error('imgbb upload failed');
        }

        // Выбираем URL в зависимости от назначения
        // useDisplayUrl=true для превью (сжатая версия для быстрой загрузки)
        // useDisplayUrl=false для оригинального файла (без сжатия)
        const selectedUrl = useDisplayUrl ? result.data.display_url : result.data.url;
        
        if (retryCount > 0) {
            console.log(`[imgbb] ✅ Изображение загружено после ${retryCount} попыток:`, {
                id: result.data.id,
                url: selectedUrl,
                type: useDisplayUrl ? 'display (превью)' : 'original (оригинал)',
            });
        } else {
            console.log('[imgbb] ✅ Изображение загружено:', {
                id: result.data.id,
                url: selectedUrl,
                type: useDisplayUrl ? 'display (превью)' : 'original (оригинал)',
            });
        }

        return selectedUrl;
    } catch (error) {
        // Проверяем на rate limit в тексте ошибки
        const errorMessage = error instanceof Error ? error.message : String(error);
        const isRateLimit = isRateLimitError(error, errorMessage);
        
        console.error('[imgbb] Ошибка в catch блоке:', {
            error: errorMessage,
            isRateLimit,
            currentKeyIndex: actualKeyIndex + 1,
            totalKeys: apiKeys.length,
            retryCount,
            triedKeys: Array.from(triedKeys).map(i => i + 1),
        });
        
        // Если это rate limit и есть другие ключи, переключаемся на следующий
        if (isRateLimit && apiKeys.length > 1 && retryCount < MAX_RETRIES) {
            // Находим следующий непробованный ключ
            let nextKeyIndex = actualKeyIndex;
            let attempts = 0;
            
            do {
                nextKeyIndex = (nextKeyIndex + 1) % apiKeys.length;
                attempts++;
                // Если все ключи уже попробованы, начинаем сначала
                if (attempts >= apiKeys.length) {
                    triedKeys.clear(); // Сбрасываем множество попробованных ключей
                    nextKeyIndex = actualKeyIndex;
                    break;
                }
            } while (triedKeys.has(nextKeyIndex) && attempts < apiKeys.length);
            
            const delay = Math.max(INITIAL_RETRY_DELAY, INITIAL_RETRY_DELAY * Math.pow(2, retryCount));
            
            console.warn(
                `[imgbb] ⚠️ Rate limit достигнут на ключе ${actualKeyIndex + 1}, переключение на ключ ${nextKeyIndex + 1}/${apiKeys.length} через ${delay}ms...`
            );
            
            await new Promise((resolve) => setTimeout(resolve, delay));
            return uploadToImgbb(imageData, retryCount + 1, useDisplayUrl, nextKeyIndex, triedKeys);
        }
        
        // Если это retryable ошибка (сетевая) и не превышен лимит попыток
        if (isRetryableError(error) && retryCount < MAX_RETRIES) {
            const delay = Math.max(INITIAL_RETRY_DELAY, INITIAL_RETRY_DELAY * Math.pow(2, retryCount));
            console.warn(
                `[imgbb] Ошибка соединения (попытка ${retryCount + 1}/${MAX_RETRIES}), повтор через ${delay}ms:`,
                errorMessage
            );

            await new Promise((resolve) => setTimeout(resolve, delay));
            return uploadToImgbb(imageData, retryCount + 1, useDisplayUrl, keyIndex, triedKeys);
        }

        // Если ошибка не retryable или превышен лимит попыток
        console.error('[imgbb] ❌ Ошибка загрузки файла (все попытки исчерпаны):', {
            error: errorMessage,
            triedKeys: Array.from(triedKeys).map(i => i + 1),
            totalKeys: apiKeys.length,
        });
        throw error;
    }
}

/**
 * Универсальная функция для загрузки одного или нескольких изображений на imgbb
 * Загружает файлы последовательно с небольшой задержкой для избежания перегрузки соединений
 * @param files - массив base64 строк или Buffer
 * @returns массив публичных URL изображений в том же порядке
 */
export async function uploadMultipleToImgbb(
    files: Array<string | Buffer>
): Promise<Array<string>> {
    const apiKeys = getImgbbApiKeys();
    
    if (apiKeys.length === 0) {
        throw new Error('IMGBB_API_KEY не настроен в .env');
    }

    if (files.length === 0) {
        return [];
    }

    console.log(`[imgbb] Загрузка ${files.length} изображений...`);

    const urls: string[] = [];
    const errors: Array<{ index: number; error: unknown }> = [];

    // Загружаем файлы последовательно с задержкой для избежания перегрузки соединений
    for (let i = 0; i < files.length; i++) {
        // Добавляем задержку между запросами (кроме первого)
        if (i > 0) {
            await new Promise((resolve) => setTimeout(resolve, PARALLEL_DELAY));
        }

        try {
            const url = await uploadToImgbb(files[i]);
            urls.push(url);
        } catch (error) {
            console.error(`[imgbb] Ошибка загрузки файла ${i + 1}:`, error);
            errors.push({ index: i, error });
            // Продолжаем загрузку остальных файлов даже при ошибке
            urls.push(''); // Добавляем пустую строку для сохранения порядка
        }
    }

    // Если были ошибки, но хотя бы один файл загружен успешно
    if (errors.length > 0 && urls.some((url) => url !== '')) {
        console.warn(
            `[imgbb] ⚠️ Загружено ${urls.filter((url) => url !== '').length} из ${files.length} изображений. Ошибок: ${errors.length}`
        );
        return urls; // Возвращаем частично успешный результат
    }

    // Если все файлы загружены успешно
    if (errors.length === 0) {
        console.log(`[imgbb] ✅ Успешно загружено ${urls.length} изображений`);
        return urls;
    }

    // Если все файлы не удалось загрузить
    console.error('[imgbb] ❌ Ошибка при пакетной загрузке:', errors);
    throw new Error(
        `Не удалось загрузить изображения на imgbb. Ошибок: ${errors.length}`
    );
}

/**
 * Проверяет доступность imgbb API (наличие хотя бы одного ключа)
 */
export function isImgbbConfigured(): boolean {
    return getImgbbApiKeys().length > 0;
}
