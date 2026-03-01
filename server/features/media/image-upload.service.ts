// Сервис загрузки изображений через node-upload-images
// Анонимная загрузка без API ключей на postimages.org, fastpic, pixhost, upload.cc
import { ImageUploadService } from 'node-upload-images';
import type { SavedFileInfo } from './file.service';
import { updateFileUrlsInDatabase } from './database.service';

type ImageHostService = 'postimages.org' | 'new.fastpic.org' | 'pixhost.to' | 'upload.cc';

const HOST_SERVICES: ImageHostService[] = [
  'postimages.org',
  'new.fastpic.org',
  'pixhost.to',
  'upload.cc',
];

const PARALLEL_DELAY = 1500;

function toBuffer(imageData: string | Buffer): Buffer {
  if (Buffer.isBuffer(imageData)) return imageData;
  const base64 = imageData.includes(',') ? imageData.split(',')[1] : imageData;
  return Buffer.from(base64, 'base64');
}

function getFilenameFromMime(mimeType?: string): string {
  const ext = mimeType?.includes('png') ? 'png' : mimeType?.includes('gif') ? 'gif' : mimeType?.includes('webp') ? 'webp' : 'jpg';
  return `image.${ext}`;
}

async function uploadWithFallback(
  buffer: Buffer,
  filename: string,
  tried: Set<ImageHostService> = new Set()
): Promise<string> {
  const servicesToTry = HOST_SERVICES.filter((s) => !tried.has(s));
  if (servicesToTry.length === 0) {
    throw new Error('Все хостинги изображений недоступны');
  }

  const serviceName = servicesToTry[0];
  tried.add(serviceName);

  try {
    const service = new ImageUploadService(serviceName);
    const { directLink } = await service.uploadFromBinary(buffer, filename);
    return directLink;
  } catch (error) {
    console.warn(`[image-upload] ${serviceName} недоступен:`, error instanceof Error ? error.message : error);
    return uploadWithFallback(buffer, filename, tried);
  }
}

export async function uploadToImgbb(
  imageData: string | Buffer,
  _retryCount = 0,
  _useDisplayUrl = false
): Promise<string> {
  const buffer = toBuffer(imageData);
  const filename = getFilenameFromMime();
  return uploadWithFallback(buffer, filename);
}

export async function uploadMultipleToImgbb(files: Array<string | Buffer>): Promise<string[]> {
  if (files.length === 0) return [];

  const urls: string[] = [];
  const errors: Array<{ index: number; error: unknown }> = [];

  for (let i = 0; i < files.length; i++) {
    if (i > 0) {
      await new Promise((r) => setTimeout(r, PARALLEL_DELAY));
    }
    try {
      const url = await uploadToImgbb(files[i]);
      urls.push(url);
    } catch (error) {
      console.error(`[image-upload] Ошибка загрузки файла ${i + 1}:`, error);
      errors.push({ index: i, error });
      urls.push('');
    }
  }

  if (errors.length > 0 && urls.some((u) => u !== '')) {
    console.warn(`[image-upload] Загружено ${urls.filter((u) => u).length} из ${files.length}`);
    return urls;
  }

  if (errors.length > 0) {
    throw new Error(`Не удалось загрузить изображения. Ошибок: ${errors.length}`);
  }

  return urls;
}

export function isImgbbConfigured(): boolean {
  return true;
}

export async function uploadImageFilesToImgbb(
  files: Array<{
    filename: string;
    path: string | null;
    url: string | null;
    previewPath: string | null;
    previewUrl: string | null;
    size: number | null;
    type: string;
    width?: number;
    height?: number;
  }>,
  _requestId: number,
  _prompt: string
): Promise<typeof files> {
  const imageFilesWithoutUrl = files.filter((f) => f.type === 'IMAGE' && !f.url && f.path);
  if (imageFilesWithoutUrl.length === 0) return files;

  const { readFile, unlink } = await import('fs/promises');
  const { existsSync } = await import('fs');
  const { join } = await import('path');
  const { mediaStorageConfig } = await import('./config');

  const fileBuffers = await Promise.all(
    imageFilesWithoutUrl.map(async (file) => {
      if (!file.path) return Buffer.from([]);
      const absolutePath = join(process.cwd(), mediaStorageConfig.basePath, file.path);
      return readFile(absolutePath);
    })
  );

  const urls = await uploadMultipleToImgbb(fileBuffers);

  let urlIndex = 0;
  const processedFiles = await Promise.all(
    files.map(async (file) => {
      if (file.type === 'IMAGE' && !file.url && file.path) {
        const url = urls[urlIndex++] || null;
        let previewUrl = file.previewUrl || null;

        if (file.previewPath && !previewUrl) {
          try {
            const absolutePreviewPath = join(process.cwd(), mediaStorageConfig.basePath, file.previewPath);
            if (existsSync(absolutePreviewPath)) {
              const previewBuffer = await readFile(absolutePreviewPath);
              previewUrl = await uploadToImgbb(previewBuffer, 0, true);
            }
          } catch (e) {
            console.error(`[image-upload] Ошибка загрузки превью ${file.filename}:`, e);
          }
        }

        if (url && process.env.NODE_ENV === 'production') {
          try {
            const absolutePath = join(process.cwd(), mediaStorageConfig.basePath, file.path);
            await unlink(absolutePath);
            if (file.previewPath) {
              const absolutePreviewPath = join(process.cwd(), mediaStorageConfig.basePath, file.previewPath);
              if (existsSync(absolutePreviewPath)) await unlink(absolutePreviewPath);
            }
            return { ...file, url, previewUrl, path: null, previewPath: null };
          } catch (e) {
            console.error(`[image-upload] Ошибка очистки ${file.filename}:`, e);
          }
        }

        return { ...file, url, previewUrl };
      }
      return file;
    })
  );

  return processedFiles;
}

export async function uploadFilesToImgbbAndUpdateDatabase(
  files: SavedFileInfo[],
  requestId: number,
  prompt: string
): Promise<void> {
  try {
    const processedFiles = await uploadImageFilesToImgbb(files, requestId, prompt);
    const filesToUpdate = processedFiles
      .filter((f) => f.url && f.type === 'IMAGE')
      .map((f) => ({
        filename: f.filename,
        url: f.url,
        previewUrl: f.previewUrl || null,
        path: f.path,
        previewPath: f.previewPath,
      }));

    if (filesToUpdate.length > 0) {
      await updateFileUrlsInDatabase(requestId, filesToUpdate);
    }
  } catch (error) {
    console.error(
      `[image-upload] Ошибка загрузки requestId=${requestId}:`,
      error instanceof Error ? error.message : error
    );
  }
}
