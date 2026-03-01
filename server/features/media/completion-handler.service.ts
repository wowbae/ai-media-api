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
  // Проверка на уже завершённый запрос
  const existingRequest = await prisma.mediaRequest.findUnique({
    where: { id: requestId },
    select: { status: true },
  });

  if (existingRequest?.status === 'COMPLETED') {
    console.log(`[CompletionHandler] Запрос requestId=${requestId} уже завершён, пропускаем`);
    return;
  }

  const providerManager = getProviderManager();
  const provider = providerManager.getProvider(model);

  if (!provider.getTaskResult) {
    throw new Error(`Провайдер ${provider.name} не поддерживает getTaskResult`);
  }

  let savedFiles: SavedFileInfo[];

  // Используем resultUrls из status чтобы избежать повторного API вызова
  if (status?.resultUrls && status.resultUrls.length > 0) {
    console.log(`[CompletionHandler] Используем resultUrls из status (${status.resultUrls.length} файлов)`);
    savedFiles = await downloadFilesFromUrls(status.resultUrls);
  } else {
    savedFiles = await provider.getTaskResult(taskId);
  }

  if (!savedFiles || savedFiles.length === 0) {
    throw new Error(`Не удалось получить результат задачи: requestId=${requestId}, taskId=${taskId}`);
  }

  // Сохраняем файлы в БД
  const savedMediaFiles = await saveFilesToDatabase(requestId, savedFiles);

  // Отправляем в Telegram (асинхронно, не блокируем)
  await sendFilesToTelegram(requestId, savedMediaFiles, prompt).catch((error) => {
    console.error(`[CompletionHandler] ⚠️ Ошибка отправки в Telegram: requestId=${requestId}:`, error.message);
  });

  // Загружаем на imgbb (асинхронно, не блокируем)
  try {
    const { uploadFilesToImgbbAndUpdateDatabase } = await import("./imgbb-upload.service");
    await uploadFilesToImgbbAndUpdateDatabase(savedFiles, requestId, prompt);
  } catch (error) {
    console.error(`[CompletionHandler] ⚠️ Ошибка загрузки на imgbb: requestId=${requestId}:`, error instanceof Error ? error.message : error);
  }

  // Обновляем статус запроса
  await prisma.mediaRequest.update({
    where: { id: requestId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
    },
  });

  // Отправляем SSE уведомление
  await sendSSENotification(requestId, 'COMPLETED', {
    filesCount: savedFiles.length,
  });

  console.log(
    `[CompletionHandler] ✅ Генерация завершена: requestId=${requestId}, файлов: ${savedFiles.length}`,
  );
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

  await prisma.mediaRequest.update({
    where: { id: requestId },
    data: {
      status: 'FAILED',
      errorMessage: formattedErrorMessage,
    },
  });

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
