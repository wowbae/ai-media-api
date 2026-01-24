// Централизованные константы приложения
import type { MediaModel, ModelInfo } from '@/redux/media-api';

// URL API сервера
export const API_URL = 'http://localhost:4000';

// URL для медиафайлов
export const MEDIA_FILES_URL = `${API_URL}/media-files`;

// Начальная задержка перед первым чеком статуса для изображений (30 секунд)
export const POLLING_INITIAL_DELAY_IMAGE = 30 * 1000;

// Начальная задержка перед первым чеком статуса для видео (70 секунд)
// Соответствует значению на бэкенде в server/features/media/polling.service.ts
export const POLLING_INITIAL_DELAY_VIDEO = 70 * 1000;

// Получить полный URL медиафайла
export function getMediaFileUrl(path: string): string {
    return `${MEDIA_FILES_URL}/${path}`;
}

// Определить начальную задержку перед polling на основе типа модели
export function getPollingInitialDelay(
    model: MediaModel | null,
    models: ModelInfo[] | undefined
): number {
    if (!model || !models) {
        return POLLING_INITIAL_DELAY_VIDEO; // По умолчанию 70 секунд
    }

    const modelInfo = models.find((m) => m.key === model);
    if (!modelInfo) {
        return POLLING_INITIAL_DELAY_VIDEO; // По умолчанию 70 секунд
    }

    // Если модель поддерживает только IMAGE (без VIDEO), используем меньшую задержку
    if (
        modelInfo.types.includes('IMAGE') &&
        !modelInfo.types.includes('VIDEO')
    ) {
        return POLLING_INITIAL_DELAY_IMAGE; // 30 секунд для изображений
    }

    // Для видео или смешанных типов используем большую задержку
    return POLLING_INITIAL_DELAY_VIDEO; // 70 секунд для видео
}
