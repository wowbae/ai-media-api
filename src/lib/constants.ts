// Централизованные константы приложения

// URL API сервера
export const API_URL = 'http://localhost:4000';

// URL для медиафайлов
export const MEDIA_FILES_URL = `${API_URL}/media-files`;

// Начальная задержка перед первым чеком статуса (70 секунд)
// Соответствует значению на бэкенде в server/features/media/polling.service.ts
export const POLLING_INITIAL_DELAY = 70 * 1000;

// Получить полный URL медиафайла
export function getMediaFileUrl(path: string): string {
    return `${MEDIA_FILES_URL}/${path}`;
}
