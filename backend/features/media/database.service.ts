// Сервис для работы с базой данных медиа-файлов
// Отвечает только за сохранение файлов в БД
import { MediaFile } from "@prisma/client";
import { prisma } from "prisma/client";
import type { SavedFileInfo } from "./file.service";
import { existsSync } from "fs";
import path from "path";
import { mediaStorageConfig } from "./config";

/**
 * Сохранение файлов в БД (атомарная операция с транзакцией)
 * Все файлы сохраняются в рамках одной транзакции для целостности данных
 */
export async function saveFilesToDatabase(
  requestId: number,
  savedFiles: SavedFileInfo[],
): Promise<MediaFile[]> {
  const request = await prisma.mediaRequest.findUnique({
    where: { id: requestId },
    include: { chat: true },
  });

  if (!request) {
    throw new Error(`Request не найден: ${requestId}`);
  }

  // Удаляем дубликаты файлов по пути или URL
  const uniqueFiles = savedFiles.filter((file, index, self) => {
    const firstIndex = self.findIndex(
      (f) =>
        (f.path && f.path === file.path) ||
        (f.url && f.url === file.url) ||
        (!f.path && !f.url && !file.path && !file.url)
    );
    return index === firstIndex;
  });

  console.log(
    `[MediaDatabase] Сохранение ${uniqueFiles.length} файлов для requestId=${requestId}`,
  );

  // Используем транзакцию для атомарного сохранения всех файлов
  const savedMediaFiles = await prisma.$transaction(async (tx) => {
    const files: MediaFile[] = [];

    for (const file of uniqueFiles) {
      const mediaFile = await tx.mediaFile.create({
        data: {
          requestId,
          type: file.type,
          filename: file.filename,
          path: file.path,
          url: file.url || null,
          previewPath: file.previewPath || null,
          previewUrl: null,
          size: file.size || null,
          width: file.width || null,
          height: file.height || null,
        },
      });

      console.log(`[MediaDatabase] Файл сохранён: id=${mediaFile.id}`, {
        type: file.type,
        path: file.path ? 'есть' : 'нет',
        url: file.url ? 'есть' : 'нет',
        previewPath: file.previewPath ? 'есть' : 'нет',
      });
      files.push(mediaFile);
    }

    return files;
  });

  return savedMediaFiles;
}

/**
 * Обновление URL файлов в БД после загрузки на imgbb
 */
export async function updateFileUrlsInDatabase(
  requestId: number,
  files: Array<{
    filename: string;
    url: string | null;
    previewUrl?: string | null;
    path?: string | null;
    previewPath?: string | null;
  }>,
): Promise<void> {
  for (const file of files) {
    if (!file.url) continue;

    try {
      const data: Record<string, unknown> = {
        url: file.url,
        ...(file.previewUrl !== undefined && { previewUrl: file.previewUrl }),
      };
      if (file.path !== undefined) data.path = file.path;
      if (file.previewPath !== undefined) data.previewPath = file.previewPath;

      await prisma.mediaFile.updateMany({
        where: {
          requestId,
          filename: file.filename,
        },
        data,
      });
    } catch (error) {
      console.error(
        `[MediaDatabase] ❌ Ошибка обновления URL для файла ${file.filename} (requestId=${requestId}):`,
        error
      );
    }
  }
}

/**
 * Синхронизация БД с файловой системой - удаление записей о несуществующих файлах
 */
export function syncMediaFilesWithFileSystem(delayMs: number = 5000): void {
  // Откладываем запуск, чтобы не блокировать старт сервера
  setTimeout(() => {
    // Запускаем синхронизацию асинхронно, не дожидаясь результата
    performSync().catch((error) => {
      console.error("[MediaDatabase] ❌ Ошибка при синхронизации:", error);
    });
  }, delayMs);
}

/**
 * Внутренняя функция для выполнения синхронизации
 */
async function performSync(): Promise<void> {
  console.log(
    "[MediaDatabase] 🔄 Начало синхронизации БД с файловой системой...",
  );

  try {
    // Получаем все медиа-файлы из БД (только те, у которых есть path для проверки)
    const allFiles = await prisma.mediaFile.findMany({
      where: {
        path: {
          not: null,
        },
      },
      select: {
        id: true,
        filename: true,
        path: true,
        previewPath: true,
      },
    });

    // console.log(`[MediaDatabase] Найдено ${allFiles.length} записей в БД`);

    if (allFiles.length === 0) {
      console.log("[MediaDatabase] ✅ Нет файлов для проверки");
      return;
    }

    const filesToDelete: number[] = [];
    const BATCH_SIZE = 100; // Проверяем файлы порциями

    // Обрабатываем файлы батчами с небольшими задержками
    for (let i = 0; i < allFiles.length; i += BATCH_SIZE) {
      const batch = allFiles.slice(i, i + BATCH_SIZE);

      for (const file of batch) {
        // Проверяем только файлы с path (видео и изображения без url)
        // Изображения с url могут не иметь локального файла (хранятся только на imgbb)
        if (!file.path) {
          continue; // Пропускаем файлы без локального пути
        }

        const absolutePath = path.join(
          process.cwd(),
          mediaStorageConfig.basePath,
          file.path,
        );

        const fileExists = existsSync(absolutePath);

        if (!fileExists) {
          console.log(
            `[MediaDatabase] ❌ Файл не найден: ${file.filename} (id=${file.id}, path=${file.path})`,
          );
          filesToDelete.push(file.id);
        }
      }

      // Небольшая задержка между батчами, чтобы не блокировать event loop
      if (i + BATCH_SIZE < allFiles.length) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }

    // Удаляем все найденные записи батчем
    if (filesToDelete.length > 0) {
      await prisma.mediaFile.deleteMany({
        where: {
          id: {
            in: filesToDelete,
          },
        },
      });
      console.log(
        `[MediaDatabase] 🗑️  Удалено ${filesToDelete.length} записей из БД`,
      );
    }

    console.log(
      `[MediaDatabase] ✅ Синхронизация завершена: проверено ${allFiles.length}, удалено ${filesToDelete.length} записей`,
    );
  } catch (error) {
    console.error("[MediaDatabase] ❌ Ошибка при синхронизации:", error);
    throw error;
  }
}
