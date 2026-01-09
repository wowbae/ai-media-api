// Сервис для работы с базой данных медиа-файлов
import { Prisma, MediaFile } from "@prisma/client";
import { prisma } from "prisma/client";
import { notifyTelegramGroupBatch } from "./telegram.notifier";
import type { SavedFileInfo } from "./file.service";
import { existsSync } from "fs";
import path from "path";
import { mediaStorageConfig } from "./config";

// Сохранение файлов в БД и отправка уведомлений
export async function saveFilesToDatabase(
  requestId: number,
  savedFiles: SavedFileInfo[],
  prompt: string,
): Promise<void> {
  const request = await prisma.mediaRequest.findUnique({
    where: { id: requestId },
    include: { chat: true },
  });

  if (!request) {
    throw new Error(`Request не найден: ${requestId}`);
  }

  // Удаляем дубликаты файлов по пути
  const uniqueFiles = savedFiles.filter(
    (file, index, self) =>
      index === self.findIndex((f) => f.path === file.path),
  );

  console.log(
    `[MediaDatabase] Сохранение ${uniqueFiles.length} файлов для requestId=${requestId}`,
  );

  const savedMediaFiles: MediaFile[] = [];

  for (const file of uniqueFiles) {
    const mediaFile = await prisma.mediaFile.create({
      data: {
        requestId,
        type: file.type,
        filename: file.filename,
        path: file.path,
        previewPath: file.previewPath,
        size: file.size,
        metadata: file.metadata as Prisma.InputJsonValue,
      },
    });

    console.log(`[MediaDatabase] Файл сохранён: id=${mediaFile.id}`);
    savedMediaFiles.push(mediaFile);
  }

  // Отправляем все файлы группой в Telegram (если есть файлы и чат)
  if (request.chat && savedMediaFiles.length > 0) {
    try {
      const telegramResult = await notifyTelegramGroupBatch(
        savedMediaFiles,
        request.chat.name,
        prompt,
      );
      console.log(
        `[MediaDatabase] Telegram: ${telegramResult ? "отправлено группой" : "не отправлено"} (${savedMediaFiles.length} файлов)`,
      );
    } catch (telegramError) {
      console.error("[MediaDatabase] Ошибка Telegram:", telegramError);
    }
  }
}

// Синхронизация БД с файловой системой - удаление записей о несуществующих файлах
export function syncMediaFilesWithFileSystem(delayMs: number = 5000): void {
  // Откладываем запуск, чтобы не блокировать старт сервера
  setTimeout(() => {
    // Запускаем синхронизацию асинхронно, не дожидаясь результата
    performSync().catch((error) => {
      console.error("[MediaDatabase] ❌ Ошибка при синхронизации:", error);
    });
  }, delayMs);
}

// Внутренняя функция для выполнения синхронизации
async function performSync(): Promise<void> {
  console.log(
    "[MediaDatabase] 🔄 Начало синхронизации БД с файловой системой...",
  );

  try {
    // Получаем все медиа-файлы из БД
    const allFiles = await prisma.mediaFile.findMany({
      select: {
        id: true,
        filename: true,
        path: true,
        previewPath: true,
      },
    });

    console.log(`[MediaDatabase] Найдено ${allFiles.length} записей в БД`);

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
        const absolutePath = path.join(
          process.cwd(),
          mediaStorageConfig.basePath,
          file.path,
        );

        const fileExists = existsSync(absolutePath);

        if (!fileExists) {
          console.log(
            `[MediaDatabase] ❌ Файл не найден: ${file.filename} (id=${file.id})`,
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
