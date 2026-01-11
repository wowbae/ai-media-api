// Центральный сервис для работы с медиа-генерацией
// Управляет генерацией через различные провайдеры (OpenRouter, GPTunnel, LaoZhang, Kie.ai и др.)
// Отвечает за:
// - Запуск генерации через выбранный провайдер
// - Polling для async провайдеров (проверка статуса задач)
// - Восстановление незавершенных задач при перезапуске сервера
// - Сохранение результатов в БД
import { MediaModel, RequestStatus } from "@prisma/client";
import { prisma } from "prisma/client";
import {
  getProviderManager,
  isTaskCreatedResult,
  type GenerateParams,
  type TaskStatusResult,
} from "./providers";
import type { SavedFileInfo } from "./file.service";
import { saveFilesToDatabase } from "./database.service";

// Интервал polling для async провайдеров (5 секунд)
const POLLING_INTERVAL = 5000;
// Максимальное время ожидания (10 минут)
const MAX_POLLING_TIME = 10 * 60 * 1000;

// Хранилище активных polling задач
const activePollingTasks = new Map<
  number,
  { taskId: string; providerName: string; model?: MediaModel }
>();

// Основная функция генерации медиа через провайдеры
export async function generateMedia(
  requestId: number,
  prompt: string,
  model: MediaModel,
  inputFiles: string[] = [],
  format?: "1:1" | "9:16" | "16:9",
  quality?: "1k" | "2k" | "4k",
  videoQuality?: "480p" | "720p" | "1080p",
  duration?: number,
  ar?: "16:9" | "9:16",
  sound?: boolean,
  outputFormat?: "png" | "jpg",
  negativePrompt?: string,
  seed?: string | number,
  cfgScale?: number,
  tailImageUrl?: string,
  voice?: string,
  stability?: number,
  similarityBoost?: number,
  speed?: number,
  languageCode?: string,
): Promise<SavedFileInfo[]> {
  const providerManager = getProviderManager();
  const provider = providerManager.getProvider(model);
  const modelConfig = providerManager.getModelConfig(model);

  console.log("[MediaService] 🚀 Генерация:", {
    requestId,
    model,
    provider: provider.name,
    isAsync: provider.isAsync,
    prompt: prompt.substring(0, 50),
    timestamp: new Date().toISOString(),
  });

  // Обновляем статус на PROCESSING
  await prisma.mediaRequest.update({
    where: { id: requestId },
    data: { status: RequestStatus.PROCESSING },
  });

  try {
    // Валидация промпта
    if (modelConfig && prompt.length > modelConfig.maxPromptLength) {
      throw new Error(
        `Промпт превышает максимальную длину ${modelConfig.maxPromptLength} символов`,
      );
    }

    const generateParams: GenerateParams = {
      requestId,
      prompt,
      model,
      inputFiles,
      aspectRatio: format as "1:1" | "9:16" | "16:9" | undefined,
      quality,
      videoQuality,
      duration,
      ar,
      sound,
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
    };

    const result = await provider.generate(generateParams);

    // Если провайдер async - запускаем polling
    if (isTaskCreatedResult(result)) {
      console.log("[MediaService] Async задача создана:", {
        taskId: result.taskId,
        provider: provider.name,
      });

      // Сохраняем taskId в БД для возможности восстановления после перезапуска
      await prisma.mediaRequest.update({
        where: { id: requestId },
        data: { taskId: result.taskId },
      });

      // Сохраняем информацию о задаче
      activePollingTasks.set(requestId, {
        taskId: result.taskId,
        providerName: provider.name,
        model,
      });

      // Запускаем polling в фоне
      pollTaskResult(requestId, result.taskId, provider.name, prompt);

      return []; // Файлы будут добавлены после завершения polling
    }

    // Sync провайдер - файлы уже готовы
    let savedFiles = result;

    // Для изображений: если провайдер вернул файлы без url, загружаем на imgbb
    // (если они были сохранены локально через saveBase64File/saveFileFromUrl, url уже должен быть)
    // Но проверяем и загружаем для тех, у кого url еще нет
    const imageFilesWithoutUrl = savedFiles.filter(
      (file) => file.type === "IMAGE" && !file.url && file.path
    );

    if (imageFilesWithoutUrl.length > 0) {
      console.log(
        `[MediaService] 🔄 Загрузка ${imageFilesWithoutUrl.length} изображений на imgbb...`
      );

      try {
        const { uploadMultipleToImgbb, isImgbbConfigured } = await import(
          "./imgbb.service"
        );
        const { readFile } = await import("fs/promises");
        const { join } = await import("path");
        const { mediaStorageConfig } = await import("./config");

        if (isImgbbConfigured()) {
          // Читаем файлы и загружаем на imgbb
          const fileBuffers = await Promise.all(
            imageFilesWithoutUrl.map(async (file) => {
              const absolutePath = join(
                process.cwd(),
                mediaStorageConfig.basePath,
                file.path
              );
              return readFile(absolutePath);
            })
          );

          const urls = await uploadMultipleToImgbb(fileBuffers);

          // Обновляем savedFiles с загруженными URL
          let urlIndex = 0;
          savedFiles = savedFiles.map((file) => {
            if (file.type === "IMAGE" && !file.url && file.path) {
              return {
                ...file,
                url: urls[urlIndex++] || null,
              };
            }
            return file;
          });

          console.log(
            `[MediaService] ✅ Загружено на imgbb: ${urls.length} изображений`
          );
        }
      } catch (error) {
        console.error(
          "[MediaService] ❌ Ошибка загрузки изображений на imgbb (продолжаем с локальными файлами):",
          error
        );
        // Не прерываем процесс, просто url останется null
      }
    }

    // Сохраняем файлы в БД (с url если есть)
    await saveFilesToDatabase(requestId, savedFiles, prompt);

    // Обновляем статус на COMPLETED
    await prisma.mediaRequest.update({
      where: { id: requestId },
      data: {
        status: RequestStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    console.log(
      `[MediaService] ✅ Генерация завершена: requestId=${requestId}, файлов: ${savedFiles.length}`,
    );

    return savedFiles;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(
      `[MediaService] ❌ Ошибка: requestId=${requestId}:`,
      errorMessage,
    );

    // Форматируем сообщение об ошибке с информацией о модели и провайдере
    const formattedErrorMessage = formatErrorMessage(
      errorMessage,
      model,
      provider.name,
    );

    await prisma.mediaRequest.update({
      where: { id: requestId },
      data: {
        status: RequestStatus.FAILED,
        errorMessage: formattedErrorMessage,
      },
    });

    throw error;
  }
}

// Polling для async провайдеров
async function pollTaskResult(
  requestId: number,
  taskId: string,
  providerName: string,
  prompt: string,
): Promise<void> {
  const startTime = Date.now();
  const providerManager = getProviderManager();

  console.log(
    `[MediaService] 🔄 Начало polling: requestId=${requestId}, taskId=${taskId}`,
  );

  // Проверяем текущий статус запроса перед началом polling
  // Если запрос уже завершен, не начинаем polling
  const initialRequest = await prisma.mediaRequest.findUnique({
    where: { id: requestId },
    select: { status: true },
  });

  if (!initialRequest) {
    console.error(
      `[MediaService] Request не найден при старте polling: requestId=${requestId}`,
    );
    activePollingTasks.delete(requestId);
    return;
  }

  // Если запрос уже в финальном статусе, не начинаем polling
  if (
    initialRequest.status === RequestStatus.COMPLETED ||
    initialRequest.status === RequestStatus.FAILED
  ) {
    console.log(
      `[MediaService] Запрос уже завершен, polling не требуется: requestId=${requestId}, status=${initialRequest.status}`,
    );
    activePollingTasks.delete(requestId);
    return;
  }

  while (Date.now() - startTime < MAX_POLLING_TIME) {
    await sleep(POLLING_INTERVAL);

    // Проверяем, не была ли задача отменена
    if (!activePollingTasks.has(requestId)) {
      console.log(`[MediaService] Polling отменён: requestId=${requestId}`);
      // Обновляем статус на FAILED при отмене
      await prisma.mediaRequest.update({
        where: { id: requestId },
        data: {
          status: RequestStatus.FAILED,
          errorMessage: "Генерация отменена",
        },
      });
      return;
    }

    try {
      // Получаем провайдер заново (на случай hot reload)
      const request = await prisma.mediaRequest.findUnique({
        where: { id: requestId },
        include: { chat: true },
      });

      if (!request) {
        console.error(`[MediaService] Request не найден: ${requestId}`);
        activePollingTasks.delete(requestId);
        return;
      }

      // Используем модель из запроса, а не из чата
      const requestModel = request.model || request.chat.model;
      const provider = providerManager.getProvider(requestModel);

      if (!provider.checkTaskStatus) {
        throw new Error(
          `Провайдер ${provider.name} не поддерживает checkTaskStatus`,
        );
      }

      const status: TaskStatusResult = await provider.checkTaskStatus(taskId);

      console.log(`[MediaService] Polling статус: requestId=${requestId}`, {
        status: status.status,
        hasUrl: !!status.url,
        error: status.error || undefined,
      });

      if (status.status === "done") {
        if (!provider.getTaskResult) {
          throw new Error(
            `Провайдер ${provider.name} не поддерживает getTaskResult`,
          );
        }

        let savedFiles = await provider.getTaskResult(taskId);

        // Для изображений: если провайдер вернул файлы без url, загружаем на imgbb
        const imageFilesWithoutUrl = savedFiles.filter(
          (file) => file.type === "IMAGE" && !file.url && file.path
        );

        if (imageFilesWithoutUrl.length > 0) {
          console.log(
            `[MediaService] 🔄 Загрузка ${imageFilesWithoutUrl.length} изображений на imgbb (async результат)...`
          );

          try {
            const { uploadMultipleToImgbb, isImgbbConfigured } = await import(
              "./imgbb.service"
            );
            const { readFile } = await import("fs/promises");
            const { join } = await import("path");
            const { mediaStorageConfig } = await import("./config");

            if (isImgbbConfigured()) {
              // Читаем файлы и загружаем на imgbb
              const fileBuffers = await Promise.all(
                imageFilesWithoutUrl.map(async (file) => {
                  const absolutePath = join(
                    process.cwd(),
                    mediaStorageConfig.basePath,
                    file.path
                  );
                  return readFile(absolutePath);
                })
              );

              const urls = await uploadMultipleToImgbb(fileBuffers);

              // Обновляем savedFiles с загруженными URL
              let urlIndex = 0;
              savedFiles = savedFiles.map((file) => {
                if (file.type === "IMAGE" && !file.url && file.path) {
                  return {
                    ...file,
                    url: urls[urlIndex++] || null,
                  };
                }
                return file;
              });

              console.log(
                `[MediaService] ✅ Загружено на imgbb (async): ${urls.length} изображений`
              );
            }
          } catch (error) {
            console.error(
              "[MediaService] ❌ Ошибка загрузки изображений на imgbb (продолжаем с локальными файлами):",
              error
            );
            // Не прерываем процесс, просто url останется null
          }
        }

        // Сохраняем файлы в БД (с url если есть)
        await saveFilesToDatabase(requestId, savedFiles, prompt);

        // Небольшая задержка для гарантии, что все файлы сохранены в БД и транзакции завершены
        await new Promise((resolve) => setTimeout(resolve, 200));

        // Обновляем статус на COMPLETED
        await prisma.mediaRequest.update({
          where: { id: requestId },
          data: {
            status: RequestStatus.COMPLETED,
            completedAt: new Date(),
          },
        });

        // Дополнительная задержка после обновления статуса для синхронизации БД
        await new Promise((resolve) => setTimeout(resolve, 100));

        activePollingTasks.delete(requestId);

        console.log(
          `[MediaService] ✅ Async генерация завершена: requestId=${requestId}, файлов: ${savedFiles.length}`,
        );
        return;
      }

      if (status.status === "failed") {
        const baseErrorMessage =
          status.error ||
          "Генерация не удалась. Детали ошибки не предоставлены провайдером.";

        // Форматируем сообщение об ошибке с информацией о модели и провайдере
        const formattedErrorMessage = formatErrorMessage(
          baseErrorMessage,
          requestModel,
          provider.name,
        );

        console.error(
          `[MediaService] ⚠️ Задача завершилась с ошибкой: requestId=${requestId}, taskId=${taskId}`,
          {
            error: status.error,
            provider: provider.name,
            model: requestModel,
          },
        );
        throw new Error(formattedErrorMessage);
      }

      // pending или processing - продолжаем polling
    } catch (error) {
      const baseErrorMessage =
        error instanceof Error ? error.message : "Polling error";
      const errorStack = error instanceof Error ? error.stack : undefined;

      console.error(
        `[MediaService] ❌ Ошибка polling: requestId=${requestId}, taskId=${taskId}:`,
        baseErrorMessage,
      );

      if (errorStack) {
        console.error("[MediaService] Stack trace:", errorStack);
      }

      // Получаем модель из запроса для форматирования ошибки
      const request = await prisma.mediaRequest.findUnique({
        where: { id: requestId },
        select: { model: true },
      });

      const requestModel = request?.model || null;
      const taskInfo = activePollingTasks.get(requestId);
      const formattedErrorMessage = formatErrorMessage(
        baseErrorMessage,
        requestModel || taskInfo?.model || null,
        taskInfo?.providerName,
      );

      await prisma.mediaRequest.update({
        where: { id: requestId },
        data: {
          status: RequestStatus.FAILED,
          errorMessage: formattedErrorMessage,
        },
      });

      activePollingTasks.delete(requestId);
      return;
    }
  }

  // Timeout
  console.error(`[MediaService] ⏱️ Timeout polling: requestId=${requestId}`);

  // Получаем модель из запроса для форматирования ошибки
  const request = await prisma.mediaRequest.findUnique({
    where: { id: requestId },
    select: { model: true },
  });

  const requestModel = request?.model || null;
  const taskInfo = activePollingTasks.get(requestId);
  const formattedErrorMessage = formatErrorMessage(
    "Превышено время ожидания генерации",
    requestModel || taskInfo?.model || null,
    taskInfo?.providerName,
  );

  await prisma.mediaRequest.update({
    where: { id: requestId },
    data: {
      status: RequestStatus.FAILED,
      errorMessage: formattedErrorMessage,
    },
  });

  activePollingTasks.delete(requestId);
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
        status: RequestStatus.PROCESSING,
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
              status: RequestStatus.FAILED,
              errorMessage: "Задача прервана перезапуском сервера",
            },
          });
          continue;
        }

        // Проверяем, не восстанавливается ли уже эта задача
        if (activePollingTasks.has(request.id)) {
          console.log(
            `[MediaService] ⚠️ requestId=${request.id} уже восстанавливается`,
          );
          continue;
        }

        // Проверяем наличие taskId для восстановления
        if (!request.taskId) {
          console.log(
            `[MediaService] ⚠️ requestId=${request.id}: невозможно восстановить - отсутствует taskId`,
          );

          // Переводим в FAILED
          await prisma.mediaRequest.update({
            where: { id: request.id },
            data: {
              status: RequestStatus.FAILED,
              errorMessage:
                "Задача прервана перезапуском сервера (восстановление невозможно без taskId)",
            },
          });
          continue;
        }

        // Восстанавливаем polling
        console.log(
          `[MediaService] 🔄 Восстанавливаем polling: requestId=${request.id}, taskId=${request.taskId}`,
        );

        // Сохраняем информацию о задаче
        activePollingTasks.set(request.id, {
          taskId: request.taskId,
          providerName: provider.name,
          model: requestModel,
        });

        // Запускаем polling в фоне
        pollTaskResult(
          request.id,
          request.taskId,
          provider.name,
          request.prompt,
        ).catch((error) => {
          console.error(
            `[MediaService] ❌ Ошибка при восстановлении polling для requestId=${request.id}:`,
            error,
          );
        });
      } catch (error) {
        console.error(
          `[MediaService] ❌ Ошибка при восстановлении requestId=${request.id}:`,
          error instanceof Error ? error.message : error,
        );

        // Переводим в FAILED при ошибке восстановления
        await prisma.mediaRequest.update({
          where: { id: request.id },
          data: {
            status: RequestStatus.FAILED,
            errorMessage: `Ошибка восстановления: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        });
      }
    }

    console.log("[MediaService] ✅ Проверка незавершенных задач завершена");
  } catch (error) {
    console.error(
      "[MediaService] ❌ Ошибка при восстановлении задач:",
      error instanceof Error ? error.message : error,
    );
  }
}

// Вспомогательная функция для форматирования сообщения об ошибке с информацией о модели и провайдере
function formatErrorMessage(
  errorMessage: string,
  model: MediaModel | null,
  providerName?: string,
): string {
  if (!model) return errorMessage;

  const providerManager = getProviderManager();
  const modelConfig = providerManager.getModelConfig(model);
  const displayProviderName =
    providerName || modelConfig?.provider || "unknown";

  return `[${modelConfig?.name || model} (${displayProviderName})] ${errorMessage}`;
}

// Вспомогательная функция для задержки
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
