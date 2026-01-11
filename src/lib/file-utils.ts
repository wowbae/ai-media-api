// Утилиты для работы с файлами

import type { AttachedFile } from '@/components/media/chat-input/use-chat-input-files';

/**
 * Проверяет, является ли строка base64 data URL
 */
export function isBase64DataUrl(str: string): boolean {
    return str.startsWith('data:image') || str.startsWith('data:video');
}

/**
 * Проверяет, является ли строка HTTP/HTTPS URL
 */
export function isHttpUrl(str: string): boolean {
    return str.startsWith('http://') || str.startsWith('https://');
}

/**
 * Разделяет файлы на изображения и видео
 */
export function separateFilesByType(files: AttachedFile[]): {
    imageFiles: AttachedFile[];
    videoFiles: AttachedFile[];
} {
    const imageFiles: AttachedFile[] = [];
    const videoFiles: AttachedFile[] = [];

    for (const file of files) {
        if (file.file.type.startsWith('image/')) {
            imageFiles.push(file);
        } else if (file.file.type.startsWith('video/')) {
            videoFiles.push(file);
        }
    }

    return { imageFiles, videoFiles };
}
