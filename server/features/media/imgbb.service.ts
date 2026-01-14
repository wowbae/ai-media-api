// Сервис для загрузки изображений на imgbb
// Используется для получения публичных URL изображений для GPTunnel API
import 'dotenv/config';

const IMGBB_API_URL = 'https://api.imgbb.com/1/upload';
const IMGBB_API_KEY = process.env.IMGBB_API_KEY || '';

// Константы для retry логики
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 секунда
const REQUEST_TIMEOUT = 30000; // 30 секунд
const PARALLEL_DELAY = 200; // Задержка между параллельными запросами (мс)

interface ImgbbResponse {
    data: {
        id: string;
        url: string;
        display_url: string;
        delete_url: string;
    };
    success: boolean;
    status: number;
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
 * Загружает одно изображение на imgbb с retry логикой
 * @param imageData - base64 строка (с или без data URL префикса) или Buffer
 * @returns публичный URL изображения
 */
export async function uploadToImgbb(
    imageData: string | Buffer,
    retryCount = 0
): Promise<string> {
    if (!IMGBB_API_KEY) {
        throw new Error('IMGBB_API_KEY не настроен в .env');
    }

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
        });
    } else {
        console.log(`[imgbb] Повторная попытка загрузки (${retryCount}/${MAX_RETRIES})...`);
    }

    const formData = new FormData();
    formData.append('key', IMGBB_API_KEY);
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
            console.error('[imgbb] Ошибка загрузки:', {
                status: response.status,
                error: errorText,
                retryCount,
            });
            throw new Error(`imgbb upload error: ${response.status} - ${errorText}`);
        }

        const result = (await response.json()) as ImgbbResponse;

        if (!result.success) {
            console.error('[imgbb] Неуспешный ответ:', result);
            throw new Error('imgbb upload failed');
        }

        if (retryCount > 0) {
            console.log(`[imgbb] ✅ Изображение загружено после ${retryCount} попыток:`, {
                id: result.data.id,
                url: result.data.display_url,
            });
        } else {
            console.log('[imgbb] ✅ Изображение загружено:', {
                id: result.data.id,
                url: result.data.display_url,
            });
        }

        return result.data.display_url;
    } catch (error) {
        // Если это retryable ошибка и не превышен лимит попыток
        if (isRetryableError(error) && retryCount < MAX_RETRIES) {
            const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount); // Экспоненциальная задержка
            console.warn(
                `[imgbb] Ошибка соединения (попытка ${retryCount + 1}/${MAX_RETRIES}), повтор через ${delay}ms:`,
                error instanceof Error ? error.message : error
            );

            await new Promise((resolve) => setTimeout(resolve, delay));
            return uploadToImgbb(imageData, retryCount + 1);
        }

        // Если ошибка не retryable или превышен лимит попыток
        console.error('[imgbb] Ошибка загрузки файла:', error);
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
    if (!IMGBB_API_KEY) {
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
 * Проверяет доступность imgbb API
 */
export function isImgbbConfigured(): boolean {
    return !!IMGBB_API_KEY;
}
