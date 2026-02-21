// Вспомогательные функции для polling сервиса
import type { MediaModel } from "./interfaces";
import { prisma } from "prisma/client";
import { getProviderManager, type TaskStatusResult } from "./providers";
import { formatErrorMessage } from "./error-utils";
import { activePollingTasks } from "./polling.service";
import { saveFilesToDatabase, sendFilesToTelegram, updateFileUrlsInDatabase } from "./database.service";

/**
 * Проверка начального статуса запроса перед началом polling
 */
export async function checkInitialRequestStatus(
  requestId: number
): Promise<{ isCompleted: boolean; shouldSkip: boolean }> {
  const initialRequest = await prisma.mediaRequest.findUnique({
    where: { id: requestId },
    select: { status: true },
  });

  if (!initialRequest) {
    console.error(
      `[MediaService] Request не найден при старте polling: requestId=${requestId}`,
    );
    activePollingTasks.delete(requestId);
    return { isCompleted: false, shouldSkip: true };
  }

  if (
    initialRequest.status === 'COMPLETED' ||
    initialRequest.status === 'FAILED'
  ) {
    console.log(
      `[MediaService] Запрос уже завершен: requestId=${requestId}, status=${initialRequest.status}`,
    );
    activePollingTasks.delete(requestId);
    return { isCompleted: initialRequest.status === 'COMPLETED', shouldSkip: true };
  }

  return { isCompleted: false, shouldSkip: false };
}

/**
 * Проверка наличия задачи в activePollingTasks
 */
export function isPollingActive(requestId: number): boolean {
  return activePollingTasks.has(requestId);
}

/**
 * Получение информации о request с chat
 */
export async function getRequestWithChat(requestId: number) {
  return prisma.mediaRequest.findUnique({
    where: { id: requestId },
    include: { chat: true },
  });
}

/**
 * Проверка статуса задачи у провайдера
 */
export async function checkProviderTaskStatus(
  providerName: string,
  model: MediaModel,
  taskId: string
): Promise<TaskStatusResult> {
  const providerManager = getProviderManager();
  const provider = providerManager.getProvider(model);

  if (!provider.checkTaskStatus) {
    throw new Error(
      `Провайдер ${providerName} не поддерживает checkTaskStatus`,
    );
  }

  return provider.checkTaskStatus(taskId);
}

/**
 * Получить результат задачи от провайдера с retry-логикой
 */
async function getTaskResultWithRetry(
  provider: any,
  taskId: string,
  requestId: number
): Promise<Awaited<ReturnType<typeof provider.getTaskResult>>> {
  const maxRetries = 3;
  let retryCount = 0;
  let savedFiles: Awaited<ReturnType<typeof provider.getTaskResult>> | null = null;

  while (retryCount < maxRetries && !savedFiles) {
    try {
      console.log(
        `[MediaService] Попытка получения результата ${retryCount + 1}/${maxRetries}: requestId=${requestId}, taskId=${taskId}`,
      );
      savedFiles = await provider.getTaskResult(taskId);
      console.log(
        `[MediaService] ✅ Результат получен: requestId=${requestId}, файлов: ${savedFiles.length}`,
      );
    } catch (getResultError) {
      retryCount++;
      const errorMessage = getResultError instanceof Error
        ? getResultError.message
        : "Unknown error";

      console.error(
        `[MediaService] ⚠️ Ошибка получения результата (попытка ${retryCount}/${maxRetries}): requestId=${requestId}, taskId=${taskId}:`,
        errorMessage,
      );

      if (retryCount >= maxRetries) {
        const existingFiles = await prisma.mediaFile.findMany({
          where: { requestId },
        });

        if (existingFiles.length > 0) {
          console.log(
            `[MediaService] ⚠️ Файлы уже есть в БД (${existingFiles.length}), возможно частичное сохранение. Продолжаем...`,
          );
          return existingFiles;
        }

        throw new Error(
          `Не удалось получить результат после ${maxRetries} попыток: ${errorMessage}`,
        );
      }

      const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
      console.log(
        `[MediaService] Повторная попытка через ${delay}ms...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  if (!savedFiles || savedFiles.length === 0) {
    throw new Error(
      `Не удалось получить результат задачи: requestId=${requestId}, taskId=${taskId}`,
    );
  }

  return savedFiles;
}

/**
 * Сохранить файлы и отправить уведомления
 */
async function saveFilesAndNotify(
  requestId: number,
  savedFiles: any[],
  prompt: string
): Promise<void> {
  // Сохраняем файлы в БД
  const savedMediaFiles = await saveFilesToDatabase(requestId, savedFiles, prompt);

  // Отправляем в Telegram
  await sendFilesToTelegram(requestId, savedMediaFiles, prompt);

  // Загружаем изображения на imgbb и обновляем URL в БД
  const { uploadFilesToImgbbAndUpdateDatabase } = await import("./imgbb.service");
  await uploadFilesToImgbbAndUpdateDatabase(savedFiles, requestId, prompt);
}

/**
 * Обновить статус запроса на COMPLETED
 */
async function markRequestCompleted(requestId: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 200));

  await prisma.mediaRequest.update({
    where: { id: requestId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
    },
  });

  await new Promise((resolve) => setTimeout(resolve, 100));
  activePollingTasks.delete(requestId);
}

/**
 * Обработка успешного завершения задачи (status = "done")
 */
export async function handleTaskCompleted(
  requestId: number,
  taskId: string,
  providerName: string,
  model: MediaModel,
  prompt: string
): Promise<void> {
  const providerManager = getProviderManager();
  const provider = providerManager.getProvider(model);

  if (!provider.getTaskResult) {
    throw new Error(
      `Провайдер ${providerName} не поддерживает getTaskResult`,
    );
  }

  // Получаем результат с retry-логикой
  const savedFiles = await getTaskResultWithRetry(provider, taskId, requestId);

  // Сохраняем файлы и отправляем уведомления
  await saveFilesAndNotify(requestId, savedFiles, prompt);

  // Обновляем статус
  await markRequestCompleted(requestId);

  console.log(
    `[MediaService] ✅ Async генерация завершена: requestId=${requestId}, файлов: ${savedFiles.length}`,
  );
}

/**
 * Обработка неудачного завершения задачи (status = "failed")
 */
export async function handleTaskFailed(
  requestId: number,
  taskId: string,
  status: TaskStatusResult,
  model: MediaModel,
  providerName: string
): Promise<void> {
  const baseErrorMessage = status.error ||
    "Генерация не удалась. Детали ошибки не предоставлены провайдером.";

  const formattedErrorMessage = formatErrorMessage(
    baseErrorMessage,
    model,
    providerName,
  );

  console.error(
    `[MediaService] ⚠️ Задача завершилась с ошибкой: requestId=${requestId}, taskId=${taskId}`,
    { error: status.error, provider: providerName, model },
  );

  await prisma.mediaRequest.update({
    where: { id: requestId },
    data: {
      status: 'FAILED',
      errorMessage: formattedErrorMessage,
    },
  });

  activePollingTasks.delete(requestId);
}

/**
 * Обработка ошибок polling
 */
export async function handlePollingError(
  requestId: number,
  error: unknown,
  providerName: string,
  startTime: number,
  maxPollingTime: number
): Promise<boolean> {
  const baseErrorMessage = error instanceof Error ? error.message : "Polling error";
  const errorStack = error instanceof Error ? error.stack : undefined;

  console.error(
    `[MediaService] ❌ Ошибка polling: requestId=${requestId}:`,
    baseErrorMessage,
  );

  if (errorStack) {
    console.error("[MediaService] Stack trace:", errorStack);
  }

  const request = await getRequestWithChat(requestId);
  if (!request) {
    console.error(`[MediaService] Request не найден при ошибке: ${requestId}`);
    activePollingTasks.delete(requestId);
    return false;
  }

  const requestModel = request.model || request.chat.model;
  const providerManager = getProviderManager();
  const provider = providerManager.getProvider(requestModel);

  const isTimeoutError =
    baseErrorMessage.includes("timeout") ||
    baseErrorMessage.includes("timed out") ||
    baseErrorMessage.includes("The operation timed out");

  if (isTimeoutError && provider.checkTaskStatus) {
    try {
      const taskInfo = activePollingTasks.get(requestId);
      if (taskInfo) {
        const finalStatus = await provider.checkTaskStatus(taskInfo.taskId);
        console.log(
          `[MediaService] Проверка статуса после ошибки: requestId=${requestId}`,
          { status: finalStatus.status, hasUrl: !!finalStatus.url },
        );

        if (finalStatus.status === "done") {
          console.log(
            `[MediaService] 🔄 Статус done после ошибки, продолжаем polling: requestId=${requestId}`,
          );
          return true;
        }
      }
    } catch (statusCheckError) {
      console.error(
        `[MediaService] ❌ Ошибка проверки статуса после ошибки: requestId=${requestId}:`,
        statusCheckError instanceof Error ? statusCheckError.message : statusCheckError,
      );
    }
  }

  const taskInfo = activePollingTasks.get(requestId);
  const formattedErrorMessage = formatErrorMessage(
    baseErrorMessage,
    taskInfo?.model || null,
    taskInfo?.providerName || providerName,
  );

  await prisma.mediaRequest.update({
    where: { id: requestId },
    data: {
      status: 'FAILED',
      errorMessage: formattedErrorMessage,
    },
  });

  activePollingTasks.delete(requestId);
  return false;
}
