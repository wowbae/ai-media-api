import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { getMediaFileUrl } from './constants'
import { type MediaFile } from '@/redux/api/base'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Форматирование размера файла в читаемый вид
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Получить оригинальный URL файла для скачивания
// Всегда использует оригинальный файл, а не превью
export function getOriginalFileUrl(file: MediaFile): string | null {
    // Для всех типов файлов приоритет: path (локальный оригинал) > url (оригинальный URL)
    // НЕ используем previewPath или previewUrl, так как это превью (сжатые версии)
    
    // Если есть локальный файл - используем его (самый надежный вариант)
    if (file.path) {
        return getMediaFileUrl(file.path);
    }
    
    // Если нет локального файла (удален после отправки в Telegram):
    // - Для IMAGE: file.url содержит оригинальный URL с imgbb (без сжатия)
    // - Для VIDEO: file.url содержит оригинальный URL провайдера
    // - Для AUDIO: file.url содержит оригинальный URL провайдера
    if (file.url) {
        return file.url;
    }
    
    return null;
}

// Скачивание файла по URL
export async function downloadFile(url: string, filename: string): Promise<void> {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Ошибка загрузки файла');

        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
        console.error('Ошибка скачивания файла:', error);
        alert('Не удалось скачать файл');
    }
}
