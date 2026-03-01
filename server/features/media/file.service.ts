// Сервис для работы с файлами: сохранение, превью, удаление
import { mkdir, writeFile, unlink, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { MediaType } from './interfaces';
import { mediaStorageConfig } from './config';

const execAsync = promisify(exec);

// Проверяем наличие sharp (опционально)
let sharp: typeof import('sharp') | null = null;
try {
    sharp = (await import('sharp')).default;
} catch {
    console.warn('Sharp не установлен - превью изображений будут недоступны');
}

// Проверяем наличие ffmpeg (для превью видео)
let hasFFmpeg: boolean | null = null;

async function checkFFmpeg(): Promise<boolean> {
    if (hasFFmpeg !== null) return hasFFmpeg;

    try {
        await execAsync('ffmpeg -version');
        hasFFmpeg = true;
        console.log('FFmpeg найден - превью видео будут доступны');
        return true;
    } catch {
        hasFFmpeg = false;
        console.warn('FFmpeg не найден - превью видео будут недоступны. Установите FFmpeg для создания превью видео.');
        return false;
    }
}

export interface SavedFileInfo {
    filename: string;
    path: string | null;      // Локальный путь (для VIDEO и отображения IMAGE)
    url: string | null;       // URL на imgbb (для IMAGE, используется для отправки в нейросеть)
    previewPath: string | null; // Локальный путь превью (для VIDEO и отображения IMAGE)
    previewUrl: string | null;  // URL превью на imgbb (для IMAGE, создается асинхронно)
    size: number | null;
    type: MediaType;
    width?: number;  // Ширина изображения (только для IMAGE)
    height?: number; // Высота изображения (только для IMAGE)
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
        console.error('Ошибка создания превью изображения:', error);
        return false;
    }
}

// Создание превью для видео (извлечение первого кадра)
async function createVideoPreview(
    sourcePath: string,
    previewPath: string
): Promise<boolean> {
    const ffmpegAvailable = await checkFFmpeg();
    if (!ffmpegAvailable) return false;

    if (!sharp) {
        console.warn('Sharp не доступен - не удастся обработать извлеченный кадр');
        return false;
    }

    try {
        // Создаем временный файл для извлеченного кадра
        const tempFramePath = `${previewPath}.temp.jpg`;

        // Извлекаем первый кадр через ffmpeg
        await execAsync(
            `ffmpeg -i "${sourcePath}" -ss 00:00:00 -vframes 1 -q:v 2 "${tempFramePath}" -y`
        );

        // Проверяем, что временный файл создан
        if (!existsSync(tempFramePath)) {
            console.error('Не удалось извлечь кадр из видео');
            return false;
        }

        // Обрабатываем извлеченный кадр через sharp
        const { width, height } = mediaStorageConfig.previewSize;
        await sharp(tempFramePath)
            .resize(width, height, {
                fit: 'cover',
                position: 'center',
            })
            .jpeg({ quality: 80 })
            .toFile(previewPath);

        // Удаляем временный файл
        try {
            await unlink(tempFramePath);
        } catch {
            // Игнорируем ошибки удаления временного файла
        }

        return true;
    } catch (error) {
        console.error('Ошибка создания превью видео:', error);

        // Удаляем временный файл если он был создан
        try {
            const tempFramePath = `${previewPath}.temp.jpg`;
            if (existsSync(tempFramePath)) {
                await unlink(tempFramePath);
            }
        } catch {
            // Игнорируем ошибки
        }

        return false;
    }
}

// Создание превью для файла в зависимости от типа
async function createPreview(
    filePath: string,
    filename: string,
    mediaType: MediaType
): Promise<string | null> {
    const previewFilename = `preview-${filename.replace(/\.[^.]+$/, '.jpg')}`;
    const fullPreviewPath = path.join(mediaStorageConfig.previewsPath, previewFilename);

    let isPreviewCreated = false;

    if (mediaType === 'IMAGE' && sharp) {
        isPreviewCreated = await createImagePreview(filePath, fullPreviewPath);
    } else if (mediaType === 'VIDEO') {
        isPreviewCreated = await createVideoPreview(filePath, fullPreviewPath);
    }

    return isPreviewCreated ? fullPreviewPath : null;
}

// Общая функция сохранения буфера в файл с превью и метаданными
async function saveBufferToFile(
    buffer: Buffer,
    mimeType: string
): Promise<SavedFileInfo> {
    await initMediaStorage();

    // Валидация размера
    if (buffer.length > mediaStorageConfig.maxFileSize) {
        throw new Error(`Файл превышает максимальный размер ${mediaStorageConfig.maxFileSize / 1024 / 1024}MB`);
    }

    // Определяем тип и путь
    const mediaType = getMediaTypeFromMime(mimeType);
    const extension = getExtensionFromMime(mimeType);
    const filename = generateFilename(extension);
    const directory = getMediaDirectory(mediaType);
    const filePath = path.join(directory, filename);

    // Сохраняем файл
    await writeFile(filePath, buffer);

    // Создаем превью
    const previewPath = await createPreview(filePath, filename, mediaType);

    // Получаем размеры изображения (только width и height)
    const dimensions = await getImageDimensions(filePath, mediaType);

    // Формируем относительные пути
    const relativePath = path.relative(mediaStorageConfig.basePath, filePath);
    const relativePreviewPath = previewPath
        ? path.relative(mediaStorageConfig.basePath, previewPath)
        : null;

    return {
        filename,
        path: relativePath,
        url: null, // URL будет загружен позже, если это изображение
        previewPath: relativePreviewPath,
        previewUrl: null, // Превью URL будет загружен асинхронно в фоне
        size: buffer.length,
        type: mediaType,
        width: dimensions.width,
        height: dimensions.height,
    };
}

// Сохранение файла из base64
// Для изображений: сохраняет локально, imgbb — опционально (deferImgbb=true для генерации)
// Для видео: только локально
export async function saveBase64File(
    base64Data: string,
    mimeType: string,
    options?: { deferImgbb?: boolean }
): Promise<SavedFileInfo> {
    const buffer = Buffer.from(base64Data, 'base64');
    const isImage = mimeType.startsWith('image/');

    if (isImage) {
        // deferImgbb: для генерации — только локально, imgbb после Telegram
        if (options?.deferImgbb) {
            return saveBufferToFile(buffer, mimeType);
        }
        return saveImageWithImgbb(buffer, mimeType);
    }

    return saveBufferToFile(buffer, mimeType);
}

// Сохранение файла из URL (скачивание)
// Для изображений: сохраняет локально, imgbb загружается позже (после отправки в Telegram)
// Для видео: сохраняет локально + сохраняет URL провайдера для последующего использования
export async function saveFileFromUrl(url: string): Promise<SavedFileInfo> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Не удалось скачать файл: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || 'image/png';
    const buffer = Buffer.from(await response.arrayBuffer());
    const isImage = contentType.startsWith('image/');
    const isVideo = contentType.startsWith('video/');

    // Сохраняем локально
    const savedFile = await saveBufferToFile(buffer, contentType);

    // Для изображений: url=null, imgbb загрузится после отправки в Telegram (uploadFilesToImgbbAndUpdateDatabase)
    if (isImage) {
        console.log('[file.service] ✅ Изображение сохранено локально (imgbb — после Telegram):', {
            filename: savedFile.filename,
            path: savedFile.path,
        });
    } else if (isVideo) {
        // Для видео: сохраняем оригинальный URL провайдера для последующего использования
        // когда файл будет удален с сервера после отправки в Telegram
        savedFile.url = url;
        console.log('[file.service] ✅ Видео сохранено локально, URL провайдера сохранен:', {
            filename: savedFile.filename,
            path: savedFile.path,
            providerUrl: url,
        });
    }

    return savedFile;
}

// Сохранение изображения с загрузкой на imgbb (гибридное сохранение)
// Сохраняет локально + загружает на imgbb, возвращает оба пути
export async function saveImageWithImgbb(
    buffer: Buffer,
    mimeType: string
): Promise<SavedFileInfo> {
    // Сохраняем локально
    const savedFile = await saveBufferToFile(buffer, mimeType);

    // Загружаем на imgbb
    try {
        const { uploadToImgbb, isImgbbConfigured } = await import('./imgbb.service');
        if (isImgbbConfigured()) {
            const imgbbUrl = await uploadToImgbb(buffer);
            savedFile.url = imgbbUrl;
            console.log('[file.service] ✅ Изображение сохранено локально и загружено на imgbb:', {
                filename: savedFile.filename,
                path: savedFile.path,
                url: imgbbUrl,
            });
        }
    } catch (error) {
        console.error('[file.service] ❌ Ошибка загрузки на imgbb (продолжаем с локальным сохранением):', error);
        // Не прерываем процесс, просто url останется null
    }

    return savedFile;
}

// Получение размеров изображения (только width и height для оптимизации)
async function getImageDimensions(
    filePath: string,
    type: MediaType
): Promise<{ width?: number; height?: number }> {
    // Для изображений получаем размеры через sharp
    if (type === 'IMAGE' && sharp) {
        try {
            const imageInfo = await sharp(filePath).metadata();
            return {
                width: imageInfo.width ?? undefined,
                height: imageInfo.height ?? undefined,
            };
        } catch (error) {
            console.error('Ошибка получения размеров изображения:', error);
        }
    }

    return {};
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

// Копирование файла (для тестового режима)
export async function copyFile(
    sourcePath: string,
    sourcePreviewPath: string | null
): Promise<{ path: string; previewPath: string | null }> {
    await initMediaStorage();

    const { readFile, copyFile: fsCopyFile } = await import('fs/promises');

    // Получаем абсолютный путь к исходному файлу
    const absoluteSourcePath = path.isAbsolute(sourcePath)
        ? sourcePath
        : path.join(mediaStorageConfig.basePath, sourcePath);

    // Проверяем существование файла
    if (!existsSync(absoluteSourcePath)) {
        throw new Error(`Исходный файл не найден: ${absoluteSourcePath}`);
    }

    // Генерируем новое имя файла
    const extension = path.extname(absoluteSourcePath);
    const newFilename = generateFilename(extension.substring(1));
    const directory = path.dirname(absoluteSourcePath);
    const newFilePath = path.join(directory, newFilename);

    // Копируем файл
    await fsCopyFile(absoluteSourcePath, newFilePath);

    // Копируем превью если есть
    let newPreviewPath: string | null = null;
    if (sourcePreviewPath) {
        const absolutePreviewPath = path.isAbsolute(sourcePreviewPath)
            ? sourcePreviewPath
            : path.join(mediaStorageConfig.basePath, sourcePreviewPath);

        if (existsSync(absolutePreviewPath)) {
            const previewFilename = `preview-${newFilename}`;
            const newPreviewFilePath = path.join(mediaStorageConfig.previewsPath, previewFilename);
            await fsCopyFile(absolutePreviewPath, newPreviewFilePath);
            newPreviewPath = path.relative(mediaStorageConfig.basePath, newPreviewFilePath);
        }
    }

    // Возвращаем относительные пути
    return {
        path: path.relative(mediaStorageConfig.basePath, newFilePath),
        previewPath: newPreviewPath,
    };
}
