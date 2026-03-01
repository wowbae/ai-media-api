// Сервис для отправки уведомлений в Telegram
// Используется для отправки результатов генерации в группу
import { MediaFile } from "@prisma/client";
import { notifyTelegramGroupBatch } from "./telegram.notifier";
import { prisma } from "prisma/client";

/**
 * Отправить файлы в Telegram
 * Асинхронная операция, не блокирует основной процесс
 */
export async function sendFilesToTelegram(
  requestId: number,
  files: MediaFile[],
  prompt: string,
): Promise<void> {
  if (files.length === 0) {
    console.warn(`[TelegramNotify] ⚠️ Нет файлов для отправки в Telegram: requestId=${requestId}`);
    return;
  }

  console.log(`[TelegramNotify] 📤 Начало отправки файлов в Telegram: requestId=${requestId}, файлов: ${files.length}`);

  // Логируем информацию о файлах
  for (const file of files) {
    console.log(`[TelegramNotify] Файл для отправки: id=${file.id}, type=${file.type}, path=${file.path ? 'есть' : 'нет'}, url=${file.url ? 'есть' : 'нет'}, filename=${file.filename}`);
  }

  const request = await prisma.mediaRequest.findUnique({
    where: { id: requestId },
    include: { chat: true },
  });

  if (!request) {
    console.error(`[TelegramNotify] ❌ Request не найден для отправки в Telegram: ${requestId}`);
    return;
  }

  if (!request.chat) {
    console.error(`[TelegramNotify] ❌ Чат не найден для requestId=${requestId}`);
    return;
  }

  console.log(`[TelegramNotify] Чат найден: name=${request.chat.name}, id=${request.chat.id}`);

  try {
    const telegramResult = await notifyTelegramGroupBatch(
      files,
      request.chat.name,
      prompt,
    );

    if (telegramResult) {
      console.log(
        `[TelegramNotify] ✅ Telegram: успешно отправлено (${files.length} файлов)`,
      );
    } else {
      console.error(
        `[TelegramNotify] ❌ Telegram: не удалось отправить (${files.length} файлов)`,
      );
    }
  } catch (telegramError) {
    console.error("[TelegramNotify] ❌ Ошибка Telegram:", telegramError);
    if (telegramError instanceof Error) {
      console.error("[TelegramNotify] Stack trace:", telegramError.stack);
    }
    // Не прерываем выполнение, просто логируем ошибку
  }
}
