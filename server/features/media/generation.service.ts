// Центральный сервис для работы с медиа-генерацией
// Управляет генерацией через различные провайдеры (GPTunnel, LaoZhang, Kie.ai, Wavespeed)
// Все провайдеры работают по async-схеме: создают задачу и возвращают taskId
// Исключение: некоторые провайдеры (laozhang-image) могут работать синхронно
import type { MediaModel } from "./interfaces";
import { prisma } from "prisma/client";
import { getProviderManager, isTaskCreatedResult, type GenerateParams } from "./providers";
import type { GenerateMediaOptions } from "./types";
import { handleTaskCompleted } from "./completion-handler.service";

/**
 * Основная функция генерации медиа через провайдеры
 * Создаёт задачу и возвращает taskId для последующей проверки статуса
 */
export async function generateMedia(options: GenerateMediaOptions): Promise<void> {
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
      `[MediaService] 🚀 Запуск генерации: requestId=${requestId}, model=${model}, provider=${provider.name}, isAsync=${provider.isAsync}`,
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
      aspectRatio: format,
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

    // Вызываем провайдер
    const result = await provider.generate(generateParams);

    // Проверяем тип результата
    if (isTaskCreatedResult(result)) {
      // Async провайдер - задача создана
      console.log("[MediaService] Async задача создана:", {
        taskId: result.taskId,
        provider: provider.name,
      });

      // Сохраняем taskId в БД
      await prisma.mediaRequest.update({
        where: { id: requestId },
        data: { 
          taskId: result.taskId,
          status: 'PENDING',
        },
      });

      console.log(
        `[MediaService] ✅ Задача создана: requestId=${requestId}, taskId=${result.taskId}`,
      );
    } else {
      // Sync провайдер - результат сразу готов
      console.log("[MediaService] Sync результат получен:", {
        filesCount: result.length,
        provider: provider.name,
      });

      // Сохраняем результат
      const { saveFilesToDatabase } = await import("./database.service");
      const { sendFilesToTelegram } = await import("./telegram-notify.service");
      const { uploadFilesToImgbbAndUpdateDatabase } = await import("./imgbb-upload.service");
      const { sendSSENotification } = await import("./sse-notification.utils");

      const savedMediaFiles = await saveFilesToDatabase(requestId, result);

      await sendFilesToTelegram(requestId, savedMediaFiles, prompt).catch((error) => {
        console.error(`[MediaService] ⚠️ Ошибка отправки в Telegram: requestId=${requestId}:`, error.message);
      });

      await uploadFilesToImgbbAndUpdateDatabase(result, requestId, prompt).catch((error) => {
        console.error(`[MediaService] ⚠️ Ошибка загрузки на imgbb: requestId=${requestId}:`, error instanceof Error ? error.message : error);
      });

      await prisma.mediaRequest.update({
        where: { id: requestId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      await sendSSENotification(requestId, 'COMPLETED', {
        filesCount: result.length,
      });

      console.log(
        `[MediaService] ✅ Генерация завершена: requestId=${requestId}, файлов: ${result.length}`,
      );
    }
  } catch (error) {
    await handleGenerationError(requestId, error, model);
    throw error;
  }
}

/**
 * Обработка ошибок генерации
 */
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

  const { formatErrorMessage } = await import("./error-utils");
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
  const { sendSSENotification } = await import("./sse-notification.utils");
  await sendSSENotification(requestId, 'FAILED', {
    errorMessage: formattedErrorMessage,
  }).catch(() => {});
}

/**
 * Получение доступных моделей
 */
export function getAvailableModels(): Array<{
  key: string;
  name: string;
  types: readonly string[];
  supportsImageInput: boolean;
}> {
  const providerManager = getProviderManager();
  return providerManager.getAvailableModels();
}
