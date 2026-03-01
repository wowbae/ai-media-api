// Сервис для обработки завершения задач генерации
// Вызывается при получении результата от провайдера (webhook или manual check)
import { prisma } from "prisma/client";
import { getProviderManager, type TaskStatusResult } from "./providers";
import type { MediaModel } from "./interfaces";
import { saveFilesToDatabase } from "./database.service";
import { sendFilesToTelegram } from "./telegram-notify.service";
import { saveFileFromUrl, type SavedFileInfo } from "./file.service";
import { sendSSENotification } from "./sse-notification.utils";
import { formatErrorMessage } from "./error-utils";
import { invalidateChatCache } from "./routes/cache";

/**
 * Обработать завершение задачи (успех)
 * Вызывается когда провайдер сообщил о завершении
 */
export async function handleTaskCompleted(
  requestId: number,
  taskId: string,
  model: MediaModel,
  prompt: string,
  status?: TaskStatusResult
): Promise<void> {
  // Идемпотентность при рестарте: если файлы уже есть (краш после сохранения, до update),
  // просто помечаем COMPLETED и выходим — без повторной отправки в Telegram
  const existing = await prisma.mediaRequest.findUnique({
    where: { id: requestId },
    select: { status: true, chatId: true, files: { select: { id: true } } },
  });
  if (existing?.status !== 'COMPLETED' && existing?.files && existing.files.length > 0) {
    console.log(`[CompletionHandler] Запрос requestId=${requestId} уже имеет файлы, помечаем COMPLETED без повторной обработки`);
    await prisma.mediaRequest.update({
      where: { id: requestId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
    if (existing.chatId) invalidateChatCache(existing.chatId);
    await sendSSENotification(requestId, 'COMPLETED', { filesCount: existing.files.length });
    return;
  }

  if (existing?.status === 'COMPLETED') {
    console.log(`[CompletionHandler] Запрос requestId=${requestId} уже завершён, пропускаем`);
    return;
  }

  // Атомарная блокировка: только первый вызов (webhook/polling) получает право обработать
  const claimed = await prisma.mediaRequest.updateMany({
    where: {
      id: requestId,
      status: { in: ['PENDING', 'PROCESSING'] },
    },
    data: { status: 'COMPLETING' },
  });

  if (claimed.count === 0) {
    console.log(`[CompletionHandler] Запрос requestId=${requestId} уже обработан или в обработке, пропускаем`);
    return;
  }

  try {
    const providerManager = getProviderManager();
    const provider = providerManager.getProvider(model);

    if (!provider.getTaskResult) {
      throw new Error(`Провайдер ${provider.name} не поддерживает getTaskResult`);
    }

    let savedFiles: SavedFileInfo[];

    if (status?.resultUrls && status.resultUrls.length > 0) {
      console.log(`[CompletionHandler] Используем resultUrls из status (${status.resultUrls.length} файлов)`);
      savedFiles = await downloadFilesFromUrls(status.resultUrls);
    } else {
      savedFiles = await provider.getTaskResult(taskId);
    }

    if (!savedFiles || savedFiles.length === 0) {
      throw new Error(`Не удалось получить результат задачи: requestId=${requestId}, taskId=${taskId}`);
    }

    const savedMediaFiles = await saveFilesToDatabase(requestId, savedFiles);

    await sendFilesToTelegram(requestId, savedMediaFiles, prompt).catch((error) => {
      console.error(`[CompletionHandler] ⚠️ Ошибка отправки в Telegram: requestId=${requestId}:`, error.message);
    });

    // Сначала помечаем COMPLETED и шлём SSE — пользователь сразу видит "Готово"
    const request = await prisma.mediaRequest.update({
      where: { id: requestId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
      select: { chatId: true },
    });
    invalidateChatCache(request.chatId);

    await sendSSENotification(requestId, 'COMPLETED', {
      filesCount: savedFiles.length,
    });

    console.log(
      `[CompletionHandler] ✅ Генерация завершена: requestId=${requestId}, файлов: ${savedFiles.length}`,
    );

    // Загрузка на imgbb в фоне — не блокирует статус "Сохранение"
    import("./imgbb-upload.service")
      .then(({ uploadFilesToImgbbAndUpdateDatabase }) =>
        uploadFilesToImgbbAndUpdateDatabase(savedFiles, requestId, prompt),
      )
      .then(() => {
        if (request.chatId) invalidateChatCache(request.chatId);
      })
      .catch((error) => {
        console.error(`[CompletionHandler] ⚠️ Ошибка загрузки на imgbb: requestId=${requestId}:`, error instanceof Error ? error.message : error);
      });
  } catch (error) {
    const failed = await prisma.mediaRequest.update({
      where: { id: requestId },
      data: {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Ошибка обработки завершения',
      },
      select: { chatId: true },
    });
    invalidateChatCache(failed.chatId);
    throw error;
  }
}

/**
 * Обработать неудачное завершение задачи
 */
export async function handleTaskFailed(
  requestId: number,
  taskId: string,
  status: TaskStatusResult,
  model: MediaModel
): Promise<void> {
  const baseErrorMessage = status.error ||
    "Генерация не удалась. Детали ошибки не предоставлены провайдером.";

  const providerManager = getProviderManager();
  const provider = providerManager.getProvider(model);

  const formattedErrorMessage = formatErrorMessage(
    baseErrorMessage,
    model,
    provider.name,
  );

  console.error(
    `[CompletionHandler] ⚠️ Задача завершилась с ошибкой: requestId=${requestId}, taskId=${taskId}`,
    { error: status.error, provider: provider.name, model },
  );

  const updated = await prisma.mediaRequest.update({
    where: { id: requestId },
    data: {
      status: 'FAILED',
      errorMessage: formattedErrorMessage,
    },
    select: { chatId: true },
  });
  invalidateChatCache(updated.chatId);

  // Отправляем SSE уведомление об ошибке
  await sendSSENotification(requestId, 'FAILED', {
    errorMessage: formattedErrorMessage,
  });
}

/**
 * Скачать файлы из URL
 */
async function downloadFilesFromUrls(urls: string[]): Promise<SavedFileInfo[]> {
  const files: SavedFileInfo[] = [];
  for (let i = 0; i < urls.length; i++) {
    const savedFile = await saveFileFromUrl(urls[i]);
    files.push(savedFile);
  }
  return files;
}
