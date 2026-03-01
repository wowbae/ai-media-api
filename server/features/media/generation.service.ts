// Центральный сервис для работы с медиа-генерацией
// Управляет генерацией через различные провайдеры (OpenRouter, GPTunnel, LaoZhang, Kie.ai и др.)
// Отвечает за:
// - Запуск генерации через выбранный провайдер
// - SSE уведомления о завершении задач
// - Восстановление незавершенных задач при перезапуске сервера
// - Сохранение результатов в БД
import type { MediaModel, RequestStatus } from "./interfaces";
import { prisma } from "prisma/client";
import {
  getProviderManager,
  isTaskCreatedResult,
  type GenerateParams,
  type TaskStatusResult,
} from "./providers";
import type { SavedFileInfo } from "./file.service";
import { saveFilesToDatabase, sendFilesToTelegram, updateFileUrlsInDatabase } from "./database.service";
import { formatErrorMessage } from "./error-utils";
import type { GenerateMediaOptions } from "./types";
import { getSSEService } from "./sse.service";

// Интервал для проверки статуса async задач (в миллисекундах)
const ASYNC_TASK_CHECK_INTERVAL = 10 * 1000; // 10 секунд

// Максимальное время ожидания async задачи (в миллисекундах)
const MAX_ASYNC_WAIT_TIME = 10 * 60 * 1000; // 10 минут

// Основная функция генерации медиа через провайдеры
export async function generateMedia(options: GenerateMediaOptions): Promise<SavedFileInfo[]> {
  const {
    requestId,
    prompt,
    model,
    inputFiles = [],
    format,
    quality,
    videoQuality,
    duration,
    ar,
    generationType,
    originalTaskId,
    sound,
    fixedLens,
    outputFormat,
    negativePrompt,
    seed,
    cfgScale,
    tailImageUrl,
    voice,
    stability,
    similarityBoost,
    speed,
    languageCode,
  } = options;

  try {
    // Получаем провайдер
    const providerManager = getProviderManager();
    const provider = providerManager.getProvider(model);

    console.log(
      `[MediaService] 🚀 Запуск генерации: requestId=${requestId}, model=${model}, provider=${provider.name}`,
    );

    // Обновляем статус на PROCESSING
    await prisma.mediaRequest.update({
      where: { id: requestId },
      data: { status: 'PROCESSING' },
    });

    // Формируем параметры для генерации
    const generateParams: GenerateParams = {
      requestId,
      prompt,
      model,
      inputFiles,
      aspectRatio: format, // format -> aspectRatio
      quality,
      videoQuality,
      duration,
      ar,
      generationType,
      originalTaskId,
      sound,
      fixedLens,
      outputFormat,
      negativePrompt,
      seed: seed !== undefined && seed !== null && String(seed).trim() !== ''
        ? String(seed)
        : undefined,
      cfgScale,
      tailImageUrl,
      voice,
      stability,
      similarityBoost,
      speed,
      languageCode,
    };

    const result = await provider.generate(generateParams);

    // Если провайдер async - запускаем background task для проверки статуса
    if (isTaskCreatedResult(result)) {
      console.log("[MediaService] Async задача создана:", {
        taskId: result.taskId,
        provider: provider.name,
      });

      // Сохраняем taskId в БД
      await prisma.mediaRequest.update({
        where: { id: requestId },
        data: { taskId: result.taskId },
      });

      // Запускаем background task для проверки статуса
      checkAsyncTaskStatus(requestId, result.taskId, provider.name, model, prompt);

      return []; // Файлы будут добавлены после завершения задачи
    }

    // Sync провайдер - файлы уже готовы
    return await handleSyncGeneration(requestId, result, prompt);
  } catch (error) {
    await handleGenerationError(requestId, error, model);
    throw error;
  }
}

// Обработка sync генерации
async function handleSyncGeneration(
  requestId: number,
  result: SavedFileInfo[],
  prompt: string
): Promise<SavedFileInfo[]> {
  // Сохраняем файлы в БД (с локальными путями)
  const savedMediaFiles = await saveFilesToDatabase(requestId, result, prompt);

  // Отправляем в Telegram (используем MediaFile[] из БД)
  await sendFilesToTelegram(requestId, savedMediaFiles, prompt).catch((error) => {
    console.error(`[MediaService] ⚠️ Ошибка отправки в Telegram: requestId=${requestId}:`, error.message);
    // Не блокируем процесс, если Telegram не работает
  });

  // Загружаем изображения на imgbb и обновляем URL в БД
  try {
    const { uploadFilesToImgbbAndUpdateDatabase } = await import("./imgbb.service");
    await uploadFilesToImgbbAndUpdateDatabase(result, requestId, prompt);
  } catch (error) {
    console.error(`[MediaService] ⚠️ Ошибка загрузки на imgbb: requestId=${requestId}:`, error instanceof Error ? error.message : error);
    // Не блокируем процесс, если imgbb не работает
  }

  // Обновляем статус на COMPLETED
  await prisma.mediaRequest.update({
    where: { id: requestId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
    },
  });

  // Отправляем SSE уведомление
  await sendSSENotification(requestId, 'COMPLETED', {
    filesCount: result.length,
  });

  console.log(
    `[MediaService] ✅ Генерация завершена: requestId=${requestId}, файлов: ${result.length}`,
  );

  return result;
}

// Background task для проверки статуса async задачи
async function checkAsyncTaskStatus(
  requestId: number,
  taskId: string,
  providerName: string,
  model: MediaModel,
  prompt: string
): Promise<void> {
  const startTime = Date.now();
  const providerManager = getProviderManager();
  const provider = providerManager.getProvider(model);

  console.log(
    `[MediaService] 🔄 Запуск background task: requestId=${requestId}, taskId=${taskId}`,
  );

  // Начальная задержка перед первой проверкой
  await sleep(5000);

  while (Date.now() - startTime < MAX_ASYNC_WAIT_TIME) {
    try {
      if (!provider.checkTaskStatus) {
        throw new Error(
          `Провайдер ${providerName} не поддерживает checkTaskStatus`,
        );
      }

      const status = await provider.checkTaskStatus(taskId);

      console.log(`[MediaService] Статус async задачи: requestId=${requestId}`, {
        status: status.status,
        hasUrl: !!status.url,
        error: status.error || undefined,
      });

      if (status.status === "done") {
        await handleAsyncTaskCompleted(requestId, taskId, providerName, model, prompt);
        return;
      }

      if (status.status === "failed") {
        await handleAsyncTaskFailed(requestId, taskId, status, model, providerName);
        return;
      }

      // Ждём перед следующей проверкой
      await sleep(ASYNC_TASK_CHECK_INTERVAL);
    } catch (error) {
      console.error(
        `[MediaService] ❌ Ошибка проверки статуса: requestId=${requestId}:`,
        error instanceof Error ? error.message : error,
      );

      // Пробуем ещё раз через интервал
      await sleep(ASYNC_TASK_CHECK_INTERVAL);
    }
  }

  // Timeout - проверяем финальный статус
  await handleAsyncTaskTimeout(requestId, taskId, providerName, model, prompt);
}

// Обработка завершения async задачи
async function handleAsyncTaskCompleted(
  requestId: number,
  taskId: string,
  providerName: string,
  model: MediaModel,
  prompt: string
): Promise<void> {
  // Завершённые запросы не обрабатываем повторно
  const request = await prisma.mediaRequest.findUnique({
    where: { id: requestId },
    select: { status: true },
  });
  if (request?.status === 'COMPLETED') {
    console.log(`[MediaService] Запрос requestId=${requestId} уже завершён, пропускаем`);
    return;
  }

  const providerManager = getProviderManager();
  const provider = providerManager.getProvider(model);

  if (!provider.getTaskResult) {
    throw new Error(
      `Провайдер ${providerName} не поддерживает getTaskResult`,
    );
  }

  const savedFiles = await getTaskResultWithRetry(provider, taskId, requestId);
  const savedMediaFiles = await saveFilesToDatabase(requestId, savedFiles, prompt);

  // Отправляем в Telegram
  await sendFilesToTelegram(requestId, savedMediaFiles, prompt).catch((error) => {
    console.error(`[MediaService] ⚠️ Ошибка отправки в Telegram: requestId=${requestId}:`, error.message);
  });

  // Загружаем изображения на imgbb и обновляем URL в БД
  try {
    const { uploadFilesToImgbbAndUpdateDatabase } = await import("./imgbb.service");
    await uploadFilesToImgbbAndUpdateDatabase(savedFiles, requestId, prompt);
  } catch (error) {
    console.error(`[MediaService] ⚠️ Ошибка загрузки на imgbb: requestId=${requestId}:`, error instanceof Error ? error.message : error);
  }

  // Обновляем статус на COMPLETED
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
    `[MediaService] ✅ Async генерация завершена: requestId=${requestId}, файлов: ${savedFiles.length}`,
  );
}

// Обработка неудачного завершения async задачи
async function handleAsyncTaskFailed(
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

  // Отправляем SSE уведомление об ошибке
  await sendSSENotification(requestId, 'FAILED', {
    errorMessage: formattedErrorMessage,
  });
}

// Обработка timeout async задачи
async function handleAsyncTaskTimeout(
  requestId: number,
  taskId: string,
  providerName: string,
  model: MediaModel,
  prompt: string
): Promise<void> {
  console.warn(`[MediaService] ⏱️ Timeout async задачи: requestId=${requestId}, проверяем финальный статус...`);

  try {
    const providerManager = getProviderManager();
    const provider = providerManager.getProvider(model);

    if (provider.checkTaskStatus) {
      const finalStatus = await provider.checkTaskStatus(taskId);
      console.log(
        `[MediaService] Финальный статус при timeout: requestId=${requestId}`,
        { status: finalStatus.status, hasUrl: !!finalStatus.url },
      );

      if (finalStatus.status === "done" && provider.getTaskResult) {
        await handleAsyncTaskCompleted(requestId, taskId, providerName, model, prompt);
        return;
      }
    }
  } catch (statusError) {
    console.error(
      `[MediaService] ❌ Ошибка проверки финального статуса: requestId=${requestId}:`,
      statusError instanceof Error ? statusError.message : statusError,
    );
  }

  // Помечаем как FAILED
  const formattedErrorMessage = formatErrorMessage(
    "Превышено время ожидания генерации",
    model,
    providerName,
  );

  await prisma.mediaRequest.update({
    where: { id: requestId },
    data: {
      status: 'FAILED',
      errorMessage: formattedErrorMessage,
    },
  });

  // Отправляем SSE уведомление
  await sendSSENotification(requestId, 'FAILED', {
    errorMessage: formattedErrorMessage,
  });
}

// Получить результат задачи с retry-логикой
async function getTaskResultWithRetry(
  provider: any,
  taskId: string,
  requestId: number
): Promise<SavedFileInfo[]> {
  const maxRetries = 3;
  let retryCount = 0;
  let savedFiles: SavedFileInfo[] | null = null;

  while (retryCount < maxRetries && !savedFiles) {
    try {
      console.log(
        `[MediaService] Попытка получения результата ${retryCount + 1}/${maxRetries}: requestId=${requestId}, taskId=${taskId}`,
      );
      savedFiles = await provider.getTaskResult(taskId);
      if (savedFiles && savedFiles.length > 0) {
        console.log(
          `[MediaService] ✅ Результат получен: requestId=${requestId}, файлов: ${savedFiles.length}`,
        );
      }
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
          return existingFiles.map((f) => ({
            filename: f.filename,
            path: f.path,
            url: f.url,
            type: f.type as SavedFileInfo["type"],
            previewPath: f.previewPath,
            previewUrl: f.previewUrl,
            size: f.size,
            width: f.width ?? undefined,
            height: f.height ?? undefined,
          }));
        }

        throw new Error(
          `Не удалось получить результат после ${maxRetries} попыток: ${errorMessage}`,
        );
      }

      const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
      await sleep(delay);
    }
  }

  if (!savedFiles || savedFiles.length === 0) {
    throw new Error(
      `Не удалось получить результат задачи: requestId=${requestId}, taskId=${taskId}`,
    );
  }

  return savedFiles;
}

// Отправить SSE уведомление
async function sendSSENotification(
  requestId: number,
  status: 'COMPLETED' | 'FAILED',
  data?: {
    filesCount?: number;
    errorMessage?: string;
  }
): Promise<void> {
  try {
    const request = await prisma.mediaRequest.findUnique({
      where: { id: requestId },
      include: { chat: true },
    });

    if (!request || !request.chat || !request.chat.userId) {
      console.warn(`[SSE] ⚠️ Request ${requestId} не найден или userId отсутствует`);
      return;
    }

    const userId = request.chat.userId;
    const sseService = getSSEService();

    const eventType: 'REQUEST_COMPLETED' | 'REQUEST_FAILED' = status === 'COMPLETED' ? 'REQUEST_COMPLETED' : 'REQUEST_FAILED';

    const event = {
      type: eventType,
      requestId,
      chatId: request.chatId,
      status,
      timestamp: new Date().toISOString(),
      data,
    };

    const sent = sseService.sendToUser(userId, event);
    if (!sent) {
      console.warn(`[SSE] ⚠️ Не удалось отправить уведомление пользователю ${userId}`);
    }
  } catch (error) {
    console.error(`[SSE] ❌ Ошибка отправки уведомления:`, error);
  }
}

// Обработка ошибок генерации
async function handleGenerationError(
  requestId: number,
  error: unknown,
  model: MediaModel
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : "Unknown error";
  console.error(
    `[MediaService] ❌ Ошибка: requestId=${requestId}:`,
    errorMessage,
  );

  const providerManager = getProviderManager();
  const provider = providerManager.getProvider(model);

  const formattedErrorMessage = formatErrorMessage(
    errorMessage,
    model,
    provider.name,
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
  }).catch(() => {});
}

// Вспомогательная функция для задержки
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Получение доступных моделей
export function getAvailableModels(): Array<{
  key: string;
  name: string;
  types: readonly string[];
  supportsImageInput: boolean;
}> {
  const providerManager = getProviderManager();
  return providerManager.getAvailableModels();
}

// Восстановление незавершенных задач при перезапуске сервера
export async function recoverUnfinishedTasks(): Promise<void> {
  try {
    console.log("[MediaService] 🔄 Проверка незавершенных задач...");

    // Находим все задачи со статусом PROCESSING
    const processingRequests = await prisma.mediaRequest.findMany({
      where: {
        status: 'PROCESSING',
      },
      include: {
        chat: true,
      },
    });

    if (processingRequests.length === 0) {
      console.log("[MediaService] ✅ Незавершенных задач не найдено");
      return;
    }

    console.log(
      `[MediaService] 🔍 Найдено незавершенных задач: ${processingRequests.length}`,
    );

    const providerManager = getProviderManager();

    for (const request of processingRequests) {
      try {
        // Используем модель из запроса
        const requestModel = request.model || request.chat.model;
        const provider = providerManager.getProvider(requestModel);

        // Только для async провайдеров с поддержкой polling
        if (!provider.isAsync || !provider.checkTaskStatus) {
          console.log(
            `[MediaService] ⚠️ Пропускаем requestId=${request.id}: провайдер ${provider.name} не поддерживает async или checkTaskStatus`,
          );
          // Переводим в FAILED, так как восстановить невозможно
          await prisma.mediaRequest.update({
            where: { id: request.id },
            data: {
              status: 'FAILED',
              errorMessage: "Задача прервана перезапуском сервера",
            },
          });
          continue;
        }

        // Проверяем наличие taskId
        if (!request.taskId) {
          console.log(
            `[MediaService] ⚠️ Пропускаем requestId=${request.id}: taskId отсутствует`,
          );
          continue;
        }

        console.log(
          `[MediaService] 🔄 Восстанавливаем background task: requestId=${request.id}, taskId=${request.taskId}`,
        );

        // Запускаем background task для проверки статуса
        checkAsyncTaskStatus(
          request.id,
          request.taskId,
          provider.name,
          requestModel as MediaModel,
          request.prompt
        );
      } catch (error) {
        console.error(
          `[MediaService] ❌ Ошибка восстановления requestId=${request.id}:`,
          error instanceof Error ? error.message : error,
        );
        // Переводим в FAILED
        await prisma.mediaRequest.update({
          where: { id: request.id },
          data: {
            status: 'FAILED',
            errorMessage: "Ошибка восстановления задачи",
          },
        });
      }
    }

    console.log("[MediaService] ✅ Проверка незавершенных задач завершена");
  } catch (error) {
    console.error(
      "[MediaService] ❌ Ошибка при проверке незавершенных задач:",
      error instanceof Error ? error.message : error,
    );
  }
}
