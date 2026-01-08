// Централизованные константы приложения

// URL API сервера
export const API_URL = 'http://localhost:4000';

// URL для медиафайлов
export const MEDIA_FILES_URL = `${API_URL}/media-files`;

// Получить полный URL медиафайла
export function getMediaFileUrl(path: string): string {
    return `${MEDIA_FILES_URL}/${path}`;
}
