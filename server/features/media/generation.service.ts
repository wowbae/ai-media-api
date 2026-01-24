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
import { saveFilesToDatabase, sendFilesToTelegram, updateFileUrlsInDatabase } from "./database.service";
import { formatErrorMessage } from "./error-utils";

// Импортируем polling сервис
import { pollTaskResult, activePollingTasks } from "./polling.service";

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
        const { pollTaskResult } = await import("./polling.service");
        pollTaskResult(requestId, result.taskId, provider.name, prompt);

      return []; // Файлы будут добавлены после завершения polling
    }

    // Sync провайдер - файлы уже готовы
    let savedFiles = result;

    // Сохраняем файлы в БД (с локальными путями)
    const savedMediaFiles = await saveFilesToDatabase(requestId, savedFiles, prompt);

    // Отправляем в Telegram (используя локальные пути)
    await sendFilesToTelegram(requestId, savedMediaFiles, prompt);

    // Пытаемся загрузить изображения на imgbb (если ошибка - не критично)
    try {
      const { uploadImageFilesToImgbb } = await import("./imgbb.service");
      const processedFiles = await uploadImageFilesToImgbb(savedFiles, requestId, prompt);
      
      // Обновляем URL в БД после успешной загрузки на imgbb
      const filesToUpdate = processedFiles
        .filter((file) => file.url && file.type === "IMAGE")
        .map((file) => ({
          filename: file.filename,
          url: file.url,
          previewUrl: file.previewUrl || null,
        }));
      
          if (filesToUpdate.length > 0) {
            await updateFileUrlsInDatabase(requestId, filesToUpdate);
          }
    } catch (imgbbError) {
      console.error(
        `[MediaService] ⚠️ Ошибка загрузки на imgbb (продолжаем без imgbb URL): requestId=${requestId}:`,
        imgbbError instanceof Error ? imgbbError.message : imgbbError
      );
      // Не прерываем выполнение, просто логируем ошибку
    }

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
        const { pollTaskResult } = await import("./polling.service");
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

