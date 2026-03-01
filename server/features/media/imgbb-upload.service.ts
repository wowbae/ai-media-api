// Сервис для загрузки файлов на imgbb
// Используется для загрузки результатов генерации и превью
import { prisma } from "prisma/client";
import { uploadToImgbb, isImgbbConfigured } from "./imgbb.service";
import { readFile } from "fs/promises";
import { join } from "path";
import { mediaStorageConfig } from "./config";
import type { SavedFileInfo } from "./file.service";

/**
 * Загрузить файлы на imgbb и обновить URL в БД
 */
export async function uploadFilesToImgbbAndUpdateDatabase(
  savedFiles: SavedFileInfo[],
  requestId: number,
  prompt: string
): Promise<void> {
  if (!isImgbbConfigured()) {
    console.log(
      `[ImgbbUpload] IMGBB_API_KEY не настроен, пропускаем загрузку для requestId=${requestId}`
    );
    return;
  }

  console.log(
    `[ImgbbUpload] 📤 Загрузка ${savedFiles.length} файлов на imgbb: requestId=${requestId}`
  );

  const filesToUpdate: Array<{
    filename: string;
    url: string | null;
    previewUrl?: string | null;
  }> = [];

  for (const file of savedFiles) {
    try {
      // Пропускаем если файл уже имеет URL (например, из resultUrls)
      if (file.url && file.url.startsWith('http')) {
        console.log(
          `[ImgbbUpload] ⏭️ Пропускаем ${file.filename}: уже имеет URL`
        );
        continue;
      }

      if (!file.path) {
        console.log(
          `[ImgbbUpload] ⏭️ Пропускаем ${file.filename}: нет локального пути`
        );
        continue;
      }

      // Читаем файл
      const absolutePath = join(
        process.cwd(),
        mediaStorageConfig.basePath,
        file.path
      );

      const fileBuffer = await readFile(absolutePath);

      // Загружаем на imgbb
      const url = await uploadToImgbb(fileBuffer, 0, true);

      if (url) {
        filesToUpdate.push({
          filename: file.filename,
          url,
        });

        console.log(
          `[ImgbbUpload] ✅ Загружено: ${file.filename} → ${url}`
        );
      }
    } catch (error) {
      console.error(
        `[ImgbbUpload] ❌ Ошибка загрузки ${file.filename}:`,
        error instanceof Error ? error.message : error
      );
    }
  }

  // Обновляем записи в БД
  if (filesToUpdate.length > 0) {
    await updateFileUrlsInDatabase(requestId, filesToUpdate);
    console.log(
      `[ImgbbUpload] ✅ Обновлено ${filesToUpdate.length} записей в БД`
    );
  }
}

/**
 * Обновить URL файлов в БД после загрузки на imgbb
 */
async function updateFileUrlsInDatabase(
  requestId: number,
  files: Array<{
    filename: string;
    url: string | null;
    previewUrl?: string | null;
  }>
): Promise<void> {
  for (const file of files) {
    if (!file.url) continue;

    try {
      await prisma.mediaFile.updateMany({
        where: {
          requestId,
          filename: file.filename,
        },
        data: {
          url: file.url,
          ...(file.previewUrl !== undefined && { previewUrl: file.previewUrl }),
        },
      });
    } catch (error) {
      console.error(
        `[ImgbbUpload] ❌ Ошибка обновления URL для файла ${file.filename} (requestId=${requestId}):`,
        error
      );
    }
  }
}

/**
 * Загрузить превью на imgbb (для видео или изображений)
 */
export async function uploadPreviewToImgbb(
  fileId: number,
  previewPath: string
): Promise<void> {
  if (!isImgbbConfigured()) {
    console.log(
      `[ImgbbUpload] IMGBB_API_KEY не настроен, пропускаем загрузку превью для fileId=${fileId}`
    );
    return;
  }

  try {
    const { readFile } = await import("fs/promises");
    const { join } = await import("path");

    // Читаем файл превью
    const absolutePreviewPath = join(
      process.cwd(),
      mediaStorageConfig.basePath,
      previewPath
    );

    const previewBuffer = await readFile(absolutePreviewPath);

    // Загружаем на imgbb (используем display_url для превью - сжатая версия)
    const previewUrl = await uploadToImgbb(previewBuffer, 0, true);

    // Обновляем запись в БД
    await prisma.mediaFile.update({
      where: { id: fileId },
      data: { previewUrl },
    });

    console.log(
      `[ImgbbUpload] ✅ Превью загружено на imgbb: fileId=${fileId}, url=${previewUrl}`
    );
  } catch (error) {
    console.error(
      `[ImgbbUpload] ❌ Ошибка загрузки превью на imgbb (fileId=${fileId}):`,
      error
    );
    // Не выбрасываем ошибку, просто логируем
  }
}
