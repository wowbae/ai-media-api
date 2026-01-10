// Сервис для загрузки изображений на imgbb
// Используется для получения публичных URL изображений для GPTunnel API
import 'dotenv/config';

const IMGBB_API_URL = 'https://api.imgbb.com/1/upload';
const IMGBB_API_KEY = process.env.IMGBB_API_KEY || '';

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
 * Загружает одно изображение на imgbb и возвращает публичный URL
 * @param imageData - base64 строка (с или без data URL префикса) или Buffer
 * @returns публичный URL изображения
 */
export async function uploadToImgbb(imageData: string | Buffer): Promise<string> {
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

    console.log('[imgbb] Загрузка изображения...', {
        isBuffer: Buffer.isBuffer(imageData),
        base64Length: base64Data.length,
    });

    const formData = new FormData();
    formData.append('key', IMGBB_API_KEY);
    formData.append('image', base64Data);

    const response = await fetch(IMGBB_API_URL, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('[imgbb] Ошибка загрузки:', {
            status: response.status,
            error: errorText,
        });
        throw new Error(`imgbb upload error: ${response.status} - ${errorText}`);
    }

    const result = (await response.json()) as ImgbbResponse;

    if (!result.success) {
        console.error('[imgbb] Неуспешный ответ:', result);
        throw new Error('imgbb upload failed');
    }

    console.log('[imgbb] ✅ Изображение загружено:', {
        id: result.data.id,
        url: result.data.display_url,
    });

    return result.data.display_url;
}

/**
 * Универсальная функция для загрузки одного или нескольких изображений на imgbb
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

    // Загружаем все файлы параллельно
    const uploadPromises = files.map((file, index) => {
        return uploadToImgbb(file).catch((error) => {
            console.error(`[imgbb] Ошибка загрузки файла ${index + 1}:`, error);
            throw error;
        });
    });

    try {
        const urls = await Promise.all(uploadPromises);
        console.log(`[imgbb] ✅ Успешно загружено ${urls.length} изображений`);
        return urls;
    } catch (error) {
        console.error('[imgbb] ❌ Ошибка при пакетной загрузке:', error);
        throw error;
    }
}

/**
 * Проверяет доступность imgbb API
 */
export function isImgbbConfigured(): boolean {
    return !!IMGBB_API_KEY;
}
