// Центральный сервис для работы с медиа-генерацией
// Управляет генерацией через различные провайдеры (OpenRouter, GPTunnel, LaoZhang, Kie.ai и др.)
// Отвечает за:
// - Запуск генерации через выбранный провайдер
// - Polling для async провайдеров (проверка статуса задач)
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
import { saveFilesToDatabase } from "./database.service";

// Начальная задержка перед первым чеком статуса (70 секунд)
const POLLING_INITIAL_DELAY = 70 * 1000;
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
  generationType?: "TEXT_2_VIDEO" | "FIRST_AND_LAST_FRAMES_2_VIDEO" | "REFERENCE_2_VIDEO" | "EXTEND_VIDEO",
  originalTaskId?: string,
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
    data: { status: 'PROCESSING' },
  });

  try {
    // Валидация промпта
    const promptLimit = modelConfig?.promptLimit ?? 5000;
    if (prompt.length > promptLimit) {
      throw new Error(
        `Промпт превышает максимальную длину ${promptLimit} символов`,
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
      generationType,
      originalTaskId,
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
        const { uploadMultipleToImgbb, uploadToImgbb, isImgbbConfigured } = await import(
          "./imgbb.service"
        );
        const { readFile, unlink } = await import("fs/promises");
        const { existsSync } = await import("fs");
        const { join } = await import("path");
        const { mediaStorageConfig } = await import("./config");

        if (isImgbbConfigured()) {
          // 1. Upload Main Files
          const fileBuffers = await Promise.all(
            imageFilesWithoutUrl.map(async (file) => {
              if (!file.path) return Buffer.from([]);
              const absolutePath = join(process.cwd(), mediaStorageConfig.basePath, file.path);
              return readFile(absolutePath);
            })
          );

          const urls = await uploadMultipleToImgbb(fileBuffers);

          // 2. Upload Previews & Update Files
          let urlIndex = 0;
          savedFiles = await Promise.all(savedFiles.map(async (file) => {
            if (file.type === "IMAGE" && !file.url && file.path) {
              const url = urls[urlIndex++] || null;
              let previewUrl = file.previewUrl || null;

              // Upload preview if exists and not yet uploaded
               if (file.previewPath && !previewUrl) {
                  try {
                      const absolutePreviewPath = join(process.cwd(), mediaStorageConfig.basePath, file.previewPath);
                      if (existsSync(absolutePreviewPath)) {
                           const previewBuffer = await readFile(absolutePreviewPath);
                           // Используем display_url для превью (сжатая версия для быстрой загрузки)
                           previewUrl = await uploadToImgbb(previewBuffer, 0, true);
                      }
                  } catch (e) {
                      console.error(`[MediaService] Failed to upload preview for ${file.filename}:`, e);
                  }
               }

               // Zero-Storage Cleanup (if successful upload and Prod)
               if (url && process.env.NODE_ENV === 'production') {
                   try {
                       const absolutePath = join(process.cwd(), mediaStorageConfig.basePath, file.path);
                       await unlink(absolutePath);
                       if (file.previewPath) {
                           const absolutePreviewPath = join(process.cwd(), mediaStorageConfig.basePath, file.previewPath);
                           if (existsSync(absolutePreviewPath)) await unlink(absolutePreviewPath);
                       }
                       // Return file with null paths
                       return { ...file, url, previewUrl, path: null, previewPath: null };
                   } catch (e) {
                       console.error(`[MediaService] Failed to cleanup local file ${file.filename}:`, e);
                   }
               }

              return { ...file, url, previewUrl };
            }
            return file;
          }));

          console.log(
            `[MediaService] ✅ Загружено на imgbb: ${urls.length} изображений`
          );
        }
      } catch (error) {
        console.error(
          "[MediaService] ❌ Ошибка загрузки изображений на imgbb (продолжаем с локальными файлами):",
          error
        );
      }
    }

    // Сохраняем файлы в БД (с url если есть)
    await saveFilesToDatabase(requestId, savedFiles, prompt);

    // Обновляем статус на COMPLETED
    await prisma.mediaRequest.update({
      where: { id: requestId },
      data: {
        status: 'COMPLETED',
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
        status: 'FAILED',
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
    initialRequest.status === 'COMPLETED' ||
    initialRequest.status === 'FAILED'
  ) {
    console.log(
      `[MediaService] Запрос уже завершен, polling не требуется: requestId=${requestId}, status=${initialRequest.status}`,
    );
    activePollingTasks.delete(requestId);
    return;
  }

  // Первая задержка перед началом polling (70 секунд)
  console.log(
    `[MediaService] ⏳ Ожидание ${POLLING_INITIAL_DELAY / 1000} секунд перед первым чеком статуса: requestId=${requestId}`,
  );
  await sleep(POLLING_INITIAL_DELAY);

  while (Date.now() - startTime < MAX_POLLING_TIME) {
    // Проверяем, не была ли задача отменена
    if (!activePollingTasks.has(requestId)) {
      console.log(`[MediaService] Polling отменён: requestId=${requestId}`);
      // Обновляем статус на FAILED при отмене
      await prisma.mediaRequest.update({
        where: { id: requestId },
        data: {
          status: 'FAILED',
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

        // Retry логика для getTaskResult - если статус done, но скачивание падает
        let savedFiles: SavedFileInfo[] | null = null;
        const maxRetries = 3;
        let retryCount = 0;

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
            const errorMessage =
              getResultError instanceof Error
                ? getResultError.message
                : "Unknown error";

            console.error(
              `[MediaService] ⚠️ Ошибка получения результата (попытка ${retryCount}/${maxRetries}): requestId=${requestId}, taskId=${taskId}:`,
              errorMessage,
            );

            if (retryCount >= maxRetries) {
              // Если все попытки исчерпаны, но статус done - это критическая ошибка
              // Проверяем, может быть файлы уже есть в БД (если предыдущая попытка частично успешна)
              const existingFiles = await prisma.mediaFile.findMany({
                where: { requestId },
              });

              if (existingFiles.length > 0) {
                console.log(
                  `[MediaService] ⚠️ Файлы уже есть в БД (${existingFiles.length}), возможно частичное сохранение. Продолжаем...`,
                );
                // Обновляем статус на COMPLETED, так как файлы уже есть
                await prisma.mediaRequest.update({
                  where: { id: requestId },
                  data: {
                    status: 'COMPLETED',
                    completedAt: new Date(),
                  },
                });
                activePollingTasks.delete(requestId);
                return;
              }

              // Если файлов нет, выбрасываем ошибку
              throw new Error(
                `Не удалось получить результат после ${maxRetries} попыток: ${errorMessage}`,
              );
            }

            // Ждем перед следующей попыткой (экспоненциальная задержка)
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

        // Для изображений: если провайдер вернул файлы без url, загружаем на imgbb
        const imageFilesWithoutUrl = savedFiles.filter(
          (file) => file.type === "IMAGE" && !file.url && file.path
        );

        if (imageFilesWithoutUrl.length > 0) {
          console.log(
            `[MediaService] 🔄 Загрузка ${imageFilesWithoutUrl.length} изображений на imgbb (async результат)...`
          );

          try {
            const { uploadMultipleToImgbb, uploadToImgbb, isImgbbConfigured } = await import(
              "./imgbb.service"
            );
            const { readFile, unlink } = await import("fs/promises");
            const { existsSync } = await import("fs");
            const { join } = await import("path");
            const { mediaStorageConfig } = await import("./config");

            if (isImgbbConfigured()) {
              // 1. Upload Main Files
              const fileBuffers = await Promise.all(
                imageFilesWithoutUrl.map(async (file) => {
                   if (!file.path) return Buffer.from([]);
                  const absolutePath = join(
                    process.cwd(),
                    mediaStorageConfig.basePath,
                    file.path
                  );
                  return readFile(absolutePath);
                })
              );

              const urls = await uploadMultipleToImgbb(fileBuffers);

             // 2. Upload Previews & Update Files
              let urlIndex = 0;
              savedFiles = await Promise.all(savedFiles.map(async (file) => {
                if (file.type === "IMAGE" && !file.url && file.path) {
                  const url = urls[urlIndex++] || null;
                  let previewUrl = file.previewUrl || null;

                    // Upload preview if exists and not yet uploaded
                   if (file.previewPath && !previewUrl) {
                      try {
                          const absolutePreviewPath = join(process.cwd(), mediaStorageConfig.basePath, file.previewPath);
                          if (existsSync(absolutePreviewPath)) {
                               const previewBuffer = await readFile(absolutePreviewPath);
                               // Используем display_url для превью (сжатая версия для быстрой загрузки)
                           previewUrl = await uploadToImgbb(previewBuffer, 0, true);
                          }
                      } catch (e) {
                          console.error(`[MediaService] Failed to upload preview for ${file.filename}:`, e);
                      }
                   }

                   // Zero-Storage Cleanup (if successful upload and Prod)
                   if (url && process.env.NODE_ENV === 'production') {
                       try {
                           const absolutePath = join(process.cwd(), mediaStorageConfig.basePath, file.path);
                           await unlink(absolutePath);
                           if (file.previewPath) {
                               const absolutePreviewPath = join(process.cwd(), mediaStorageConfig.basePath, file.previewPath);
                               if (existsSync(absolutePreviewPath)) await unlink(absolutePreviewPath);
                           }
                           // Return file with null paths
                           return { ...file, url, previewUrl, path: null, previewPath: null };
                       } catch (e) {
                           console.error(`[MediaService] Failed to cleanup local file ${file.filename}:`, e);
                       }
                   }

                  return { ...file, url, previewUrl };
                }
                return file;
              }));

              console.log(
                `[MediaService] ✅ Загружено на imgbb (async): ${urls.length} изображений`
              );
            }
          } catch (error) {
            console.error(
              "[MediaService] ❌ Ошибка загрузки изображений на imgbb (продолжаем с локальными файлами):",
              error
            );
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
            status: 'COMPLETED',
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

      // Задержка перед следующей проверкой
      await sleep(POLLING_INTERVAL);
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

      // Проверяем, может статус уже done, но произошла ошибка при получении результата
      // В этом случае не помечаем как FAILED сразу, а продолжаем polling
      const request = await prisma.mediaRequest.findUnique({
        where: { id: requestId },
        include: { chat: true },
      });

      if (!request) {
        console.error(`[MediaService] Request не найден при ошибке: ${requestId}`);
        activePollingTasks.delete(requestId);
        return;
      }

      const requestModel = request.model || request.chat.model;
      const provider = providerManager.getProvider(requestModel);

      // Если ошибка связана с timeout или сетью, но статус может быть done
      // Проверяем финальный статус перед пометкой как FAILED
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
              {
                status: finalStatus.status,
                hasUrl: !!finalStatus.url,
              },
            );

            // Если статус done, продолжаем polling (войдем в цикл снова и обработаем)
            if (finalStatus.status === "done") {
              console.log(
                `[MediaService] 🔄 Статус done после ошибки, продолжаем polling: requestId=${requestId}`,
              );
              // Продолжаем цикл while - не помечаем как FAILED
              continue;
            }
          }
        } catch (statusCheckError) {
          console.error(
            `[MediaService] ❌ Ошибка проверки статуса после ошибки: requestId=${requestId}:`,
            statusCheckError instanceof Error
              ? statusCheckError.message
              : statusCheckError,
          );
          // Продолжаем - пометим как FAILED
        }
      }

      // Если это не timeout или статус не done - помечаем как FAILED
      const requestModelForError = request.model || null;
      const taskInfo = activePollingTasks.get(requestId);
      const formattedErrorMessage = formatErrorMessage(
        baseErrorMessage,
        requestModelForError || taskInfo?.model || null,
        taskInfo?.providerName,
      );

      await prisma.mediaRequest.update({
        where: { id: requestId },
        data: {
          status: 'FAILED',
          errorMessage: formattedErrorMessage,
        },
      });

      activePollingTasks.delete(requestId);
      return;
    }
  }

  // Timeout - но перед пометкой как FAILED проверяем, может статус уже done
  console.warn(`[MediaService] ⏱️ Timeout polling: requestId=${requestId}, проверяем финальный статус...`);

  try {
    const request = await prisma.mediaRequest.findUnique({
      where: { id: requestId },
      include: { chat: true },
    });

    if (!request) {
      console.error(`[MediaService] Request не найден при timeout: ${requestId}`);
      activePollingTasks.delete(requestId);
      return;
    }

    // Используем модель из запроса
    const requestModel = request.model || request.chat.model;
    const provider = providerManager.getProvider(requestModel);

    // Последняя попытка проверить статус - может задача уже завершена
    if (provider.checkTaskStatus) {
      const taskInfo = activePollingTasks.get(requestId);
      if (taskInfo) {
        try {
          const finalStatus = await provider.checkTaskStatus(taskInfo.taskId);
          console.log(
            `[MediaService] Финальный статус при timeout: requestId=${requestId}`,
            {
              status: finalStatus.status,
              hasUrl: !!finalStatus.url,
            },
          );

          // Если статус done, пытаемся получить результат
          if (finalStatus.status === "done" && provider.getTaskResult) {
            console.log(
              `[MediaService] 🔄 Статус done при timeout, пытаемся получить результат: requestId=${requestId}`,
            );
            try {
              const savedFiles = await provider.getTaskResult(taskInfo.taskId);

              // Обрабатываем файлы так же, как в основном цикле
              const imageFilesWithoutUrl = savedFiles.filter(
                (file) => file.type === "IMAGE" && !file.url && file.path
              );

              if (imageFilesWithoutUrl.length > 0) {
                const { uploadMultipleToImgbb, uploadToImgbb, isImgbbConfigured } = await import(
                  "./imgbb.service"
                );
                const { readFile, unlink } = await import("fs/promises");
                const { existsSync } = await import("fs");
                const { join } = await import("path");
                const { mediaStorageConfig } = await import("./config");

                if (isImgbbConfigured()) {
                  const fileBuffers = await Promise.all(
                    imageFilesWithoutUrl.map(async (file) => {
                      if (!file.path) return Buffer.from([]);
                      const absolutePath = join(
                        process.cwd(),
                        mediaStorageConfig.basePath,
                        file.path
                      );
                      return readFile(absolutePath);
                    })
                  );

                  const urls = await uploadMultipleToImgbb(fileBuffers);

                  let urlIndex = 0;
                  const processedFiles = await Promise.all(savedFiles.map(async (file) => {
                    if (file.type === "IMAGE" && !file.url && file.path) {
                      const url = urls[urlIndex++] || null;
                      let previewUrl = file.previewUrl || null;

                      if (file.previewPath && !previewUrl) {
                        try {
                          const absolutePreviewPath = join(process.cwd(), mediaStorageConfig.basePath, file.previewPath);
                          if (existsSync(absolutePreviewPath)) {
                            const previewBuffer = await readFile(absolutePreviewPath);
                            previewUrl = await uploadToImgbb(previewBuffer, 0, true);
                          }
                        } catch (e) {
                          console.error(`[MediaService] Failed to upload preview for ${file.filename}:`, e);
                        }
                      }

                      if (url && process.env.NODE_ENV === 'production') {
                        try {
                          const absolutePath = join(process.cwd(), mediaStorageConfig.basePath, file.path);
                          await unlink(absolutePath);
                          if (file.previewPath) {
                            const absolutePreviewPath = join(process.cwd(), mediaStorageConfig.basePath, file.previewPath);
                            if (existsSync(absolutePreviewPath)) await unlink(absolutePreviewPath);
                          }
                          return { ...file, url, previewUrl, path: null, previewPath: null };
                        } catch (e) {
                          console.error(`[MediaService] Failed to cleanup local file ${file.filename}:`, e);
                        }
                      }

                      return { ...file, url, previewUrl };
                    }
                    return file;
                  }));

                  await saveFilesToDatabase(requestId, processedFiles, request.prompt);
                } else {
                  await saveFilesToDatabase(requestId, savedFiles, request.prompt);
                }
              } else {
                await saveFilesToDatabase(requestId, savedFiles, request.prompt);
              }

              await prisma.mediaRequest.update({
                where: { id: requestId },
                data: {
                  status: 'COMPLETED',
                  completedAt: new Date(),
                },
              });

              activePollingTasks.delete(requestId);

              console.log(
                `[MediaService] ✅ Результат получен после timeout: requestId=${requestId}, файлов: ${savedFiles.length}`,
              );
              return; // Успешно завершили, выходим
            } catch (getResultError) {
              console.error(
                `[MediaService] ❌ Ошибка получения результата при timeout: requestId=${requestId}:`,
                getResultError instanceof Error ? getResultError.message : getResultError,
              );
              // Продолжаем - пометим как FAILED
            }
          }
        } catch (statusError) {
          console.error(
            `[MediaService] ❌ Ошибка проверки финального статуса при timeout: requestId=${requestId}:`,
            statusError instanceof Error ? statusError.message : statusError,
          );
          // Продолжаем - пометим как FAILED
        }
      }
    }
  } catch (error) {
    console.error(
      `[MediaService] ❌ Ошибка при проверке финального статуса: requestId=${requestId}:`,
      error instanceof Error ? error.message : error,
    );
  }

  // Если дошли сюда - помечаем как FAILED
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
              status: 'FAILED',
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
            status: 'FAILED',
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
