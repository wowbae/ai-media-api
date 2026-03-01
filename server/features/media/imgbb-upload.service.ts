// Сервис загрузки файлов на хостинг изображений (postimages.org и др.)
// Используется для загрузки результатов генерации и превью
import { prisma } from "prisma/client";
import { uploadToImgbb } from "./imgbb.service";
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
  console.log(
    `[ImageUpload] 📤 Загрузка ${savedFiles.length} файлов: requestId=${requestId}`
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
          `[ImageUpload] ⏭️ Пропускаем ${file.filename}: уже имеет URL`
        );
        continue;
      }

      if (!file.path) {
        console.log(
          `[ImageUpload] ⏭️ Пропускаем ${file.filename}: нет локального пути`
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

      const url = await uploadToImgbb(fileBuffer, 0, true);

      if (url) {
        filesToUpdate.push({
          filename: file.filename,
          url,
        });

        console.log(
          `[ImageUpload] ✅ Загружено: ${file.filename} → ${url}`
        );
      }
    } catch (error) {
      console.error(
        `[ImageUpload] ❌ Ошибка загрузки ${file.filename}:`,
        error instanceof Error ? error.message : error
      );
    }
  }

  // Обновляем записи в БД
  if (filesToUpdate.length > 0) {
    await updateFileUrlsInDatabase(requestId, filesToUpdate);
    console.log(
      `[ImageUpload] ✅ Обновлено ${filesToUpdate.length} записей в БД`
    );
  }
}

/**
 * Обновить URL файлов в БД после загрузки
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
        `[ImageUpload] ❌ Ошибка обновления URL для файла ${file.filename} (requestId=${requestId}):`,
        error
      );
    }
  }
}

/**
 * Загрузить превью на хостинг (для видео или изображений)
 */
export async function uploadPreviewToImgbb(
  fileId: number,
  previewPath: string
): Promise<void> {
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

    const previewUrl = await uploadToImgbb(previewBuffer, 0, true);

    await prisma.mediaFile.update({
      where: { id: fileId },
      data: { previewUrl },
    });

    console.log(
      `[ImageUpload] ✅ Превью загружено: fileId=${fileId}, url=${previewUrl}`
    );
  } catch (error) {
    console.error(
      `[ImageUpload] ❌ Ошибка загрузки превью (fileId=${fileId}):`,
      error
    );
    // Не выбрасываем ошибку, просто логируем
  }
}
