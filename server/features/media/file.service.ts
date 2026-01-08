// Сервис для работы с файлами: сохранение, превью, удаление
import { mkdir, writeFile, unlink, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { MediaType } from '@prisma/client';
import { mediaStorageConfig } from './config';

// Проверяем наличие sharp (опционально)
let sharp: typeof import('sharp') | null = null;
try {
    sharp = (await import('sharp')).default;
} catch {
    console.warn('Sharp не установлен - превью изображений будут недоступны');
}

export interface SavedFileInfo {
    filename: string;
    path: string;
    previewPath: string | null;
    size: number;
    type: MediaType;
    metadata: Record<string, unknown>;
}

// Инициализация директорий для хранения файлов
export async function initMediaStorage(): Promise<void> {
    const dirs = [
        mediaStorageConfig.basePath,
        mediaStorageConfig.previewsPath,
        path.join(mediaStorageConfig.basePath, 'images'),
        path.join(mediaStorageConfig.basePath, 'videos'),
        path.join(mediaStorageConfig.basePath, 'audio'),
    ];

    for (const dir of dirs) {
        if (!existsSync(dir)) {
            await mkdir(dir, { recursive: true });
            console.log(`Создана директория: ${dir}`);
        }
    }
}

// Генерация уникального имени файла
function generateFilename(extension: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${random}.${extension}`;
}

// Определение типа медиа по MIME типу
function getMediaTypeFromMime(mimeType: string): MediaType {
    if (mediaStorageConfig.allowedImageTypes.includes(mimeType)) return 'IMAGE';
    if (mediaStorageConfig.allowedVideoTypes.includes(mimeType)) return 'VIDEO';
    if (mediaStorageConfig.allowedAudioTypes.includes(mimeType)) return 'AUDIO';
    return 'IMAGE'; // default
}

// Получение расширения файла из MIME типа
function getExtensionFromMime(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'image/gif': 'gif',
        'video/mp4': 'mp4',
        'video/webm': 'webm',
        'video/quicktime': 'mov',
        'audio/mpeg': 'mp3',
        'audio/wav': 'wav',
        'audio/ogg': 'ogg',
    };
    return mimeToExt[mimeType] || 'bin';
}

// Получение директории для типа медиа
function getMediaDirectory(type: MediaType): string {
    const typeToDir: Record<MediaType, string> = {
        IMAGE: 'images',
        VIDEO: 'videos',
        AUDIO: 'audio',
    };
    return path.join(mediaStorageConfig.basePath, typeToDir[type]);
}

// Создание превью для изображения
async function createImagePreview(
    sourcePath: string,
    previewPath: string
): Promise<boolean> {
    if (!sharp) return false;

    try {
        const { width, height } = mediaStorageConfig.previewSize;
        await sharp(sourcePath)
            .resize(width, height, {
                fit: 'cover',
                position: 'center',
            })
            .jpeg({ quality: 80 })
            .toFile(previewPath);
        return true;
    } catch (error) {
        console.error('Ошибка создания превью:', error);
        return false;
    }
}

// Сохранение файла из base64
export async function saveBase64File(
    base64Data: string,
    mimeType: string
): Promise<SavedFileInfo> {
    await initMediaStorage();

    const mediaType = getMediaTypeFromMime(mimeType);
    const extension = getExtensionFromMime(mimeType);
    const filename = generateFilename(extension);
    const directory = getMediaDirectory(mediaType);
    const filePath = path.join(directory, filename);

    // Декодируем base64 и сохраняем
    const buffer = Buffer.from(base64Data, 'base64');

    if (buffer.length > mediaStorageConfig.maxFileSize) {
        throw new Error(`Файл превышает максимальный размер ${mediaStorageConfig.maxFileSize / 1024 / 1024}MB`);
    }

    await writeFile(filePath, buffer);

    // Создаем превью для изображений
    let previewPath: string | null = null;
    if (mediaType === 'IMAGE' && sharp) {
        const previewFilename = `preview-${filename}`;
        const fullPreviewPath = path.join(mediaStorageConfig.previewsPath, previewFilename);
        const isPreviewCreated = await createImagePreview(filePath, fullPreviewPath);
        if (isPreviewCreated) {
            previewPath = fullPreviewPath;
        }
    }

    // Получаем метаданные
    const metadata = await getFileMetadata(filePath, mediaType);

    // Сохраняем относительный путь от ai-media для правильной работы со статикой
    const relativePath = path.relative(mediaStorageConfig.basePath, filePath);
    const relativePreviewPath = previewPath
        ? path.relative(mediaStorageConfig.basePath, previewPath)
        : null;

    return {
        filename,
        path: relativePath,
        previewPath: relativePreviewPath,
        size: buffer.length,
        type: mediaType,
        metadata,
    };
}

// Сохранение файла из URL (скачивание)
export async function saveFileFromUrl(url: string): Promise<SavedFileInfo> {
    await initMediaStorage();

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Не удалось скачать файл: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || 'image/png';
    const buffer = Buffer.from(await response.arrayBuffer());

    const mediaType = getMediaTypeFromMime(contentType);
    const extension = getExtensionFromMime(contentType);
    const filename = generateFilename(extension);
    const directory = getMediaDirectory(mediaType);
    const filePath = path.join(directory, filename);

    if (buffer.length > mediaStorageConfig.maxFileSize) {
        throw new Error(`Файл превышает максимальный размер ${mediaStorageConfig.maxFileSize / 1024 / 1024}MB`);
    }

    await writeFile(filePath, buffer);

    // Создаем превью для изображений
    let previewPath: string | null = null;
    if (mediaType === 'IMAGE' && sharp) {
        const previewFilename = `preview-${filename}`;
        const fullPreviewPath = path.join(mediaStorageConfig.previewsPath, previewFilename);
        const isPreviewCreated = await createImagePreview(filePath, fullPreviewPath);
        if (isPreviewCreated) {
            previewPath = fullPreviewPath;
        }
    }

    const metadata = await getFileMetadata(filePath, mediaType);

    // Сохраняем относительный путь от ai-media для правильной работы со статикой
    const relativePath = path.relative(mediaStorageConfig.basePath, filePath);
    const relativePreviewPath = previewPath
        ? path.relative(mediaStorageConfig.basePath, previewPath)
        : null;

    return {
        filename,
        path: relativePath,
        previewPath: relativePreviewPath,
        size: buffer.length,
        type: mediaType,
        metadata,
    };
}

// Получение метаданных файла
async function getFileMetadata(
    filePath: string,
    type: MediaType
): Promise<Record<string, unknown>> {
    const metadata: Record<string, unknown> = {};

    try {
        const fileStat = await stat(filePath);
        metadata.createdAt = fileStat.birthtime;
        metadata.modifiedAt = fileStat.mtime;

        // Для изображений получаем размеры через sharp
        if (type === 'IMAGE' && sharp) {
            const imageInfo = await sharp(filePath).metadata();
            metadata.width = imageInfo.width;
            metadata.height = imageInfo.height;
            metadata.format = imageInfo.format;
            metadata.space = imageInfo.space;
            metadata.hasAlpha = imageInfo.hasAlpha;
        }
    } catch (error) {
        console.error('Ошибка получения метаданных:', error);
    }

    return metadata;
}

// Удаление файла и его превью
export async function deleteFile(filePath: string, previewPath?: string | null): Promise<void> {
    try {
        if (existsSync(filePath)) {
            await unlink(filePath);
        }
        if (previewPath && existsSync(previewPath)) {
            await unlink(previewPath);
        }
    } catch (error) {
        console.error('Ошибка удаления файла:', error);
    }
}

// Проверка валидности MIME типа
export function isValidMimeType(mimeType: string): boolean {
    const allAllowed = [
        ...mediaStorageConfig.allowedImageTypes,
        ...mediaStorageConfig.allowedVideoTypes,
        ...mediaStorageConfig.allowedAudioTypes,
    ];
    return allAllowed.includes(mimeType);
}

