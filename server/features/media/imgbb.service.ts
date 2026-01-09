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
 * Загружает изображение на imgbb и возвращает публичный URL
 * @param imageData - base64 строка (с или без data URL префикса)
 * @returns публичный URL изображения
 */
export async function uploadToImgbb(imageData: string): Promise<string> {
    if (!IMGBB_API_KEY) {
        throw new Error('IMGBB_API_KEY не настроен в .env');
    }

    // Убираем data URL префикс если есть (data:image/...;base64,)
    let base64Data = imageData;
    if (imageData.includes(',')) {
        base64Data = imageData.split(',')[1];
    }

    console.log('[imgbb] Загрузка изображения...', {
        originalLength: imageData.length,
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
 * Проверяет доступность imgbb API
 */
export function isImgbbConfigured(): boolean {
    return !!IMGBB_API_KEY;
}
