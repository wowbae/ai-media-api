// Сервис для polling статуса async задач генерации
import type { MediaModel } from "./interfaces";
import { prisma } from "prisma/client";
import {
  getProviderManager,
  type TaskStatusResult,
} from "./providers";
import type { SavedFileInfo } from "./file.service";
import { saveFilesToDatabase } from "./database.service";
import { uploadImageFilesToImgbb } from "./imgbb.service";
import { formatErrorMessage } from "./error-utils";

// Начальная задержка перед первым чеком статуса (70 секунд)
const POLLING_INITIAL_DELAY = 70 * 1000;
// Интервал polling для async провайдеров (5 секунд)
const POLLING_INTERVAL = 5000;
// Максимальное время ожидания (10 минут)
const MAX_POLLING_TIME = 10 * 60 * 1000;

// Хранилище активных polling задач
export const activePollingTasks = new Map<
  number,
  { taskId: string; providerName: string; model?: MediaModel }
>();

/**
 * Polling для async провайдеров
 */
export async function pollTaskResult(
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
      const request = await prisma.mediaRequest.findUnique({
        where: { id: requestId },
        include: { chat: true },
      });

      if (!request) {
        console.error(`[MediaService] Request не найден: ${requestId}`);
        activePollingTasks.delete(requestId);
        return;
      }

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

        // Retry логика для getTaskResult
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
              const existingFiles = await prisma.mediaFile.findMany({
                where: { requestId },
              });

              if (existingFiles.length > 0) {
                console.log(
                  `[MediaService] ⚠️ Файлы уже есть в БД (${existingFiles.length}), возможно частичное сохранение. Продолжаем...`,
                );
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

        // Загружаем изображения на imgbb
        const processedFiles = await uploadImageFilesToImgbb(
          savedFiles,
          requestId,
          prompt
        );

        // Сохраняем файлы в БД
        await saveFilesToDatabase(requestId, processedFiles, prompt);

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

        console.log(
          `[MediaService] ✅ Async генерация завершена: requestId=${requestId}, файлов: ${processedFiles.length}`,
        );
        return;
      }

      if (status.status === "failed") {
        const baseErrorMessage =
          status.error ||
          "Генерация не удалась. Детали ошибки не предоставлены провайдером.";

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

            if (finalStatus.status === "done") {
              console.log(
                `[MediaService] 🔄 Статус done после ошибки, продолжаем polling: requestId=${requestId}`,
              );
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
        }
      }

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

  // Timeout - проверяем финальный статус
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

    const requestModel = request.model || request.chat.model;
    const provider = providerManager.getProvider(requestModel);

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

          if (finalStatus.status === "done" && provider.getTaskResult) {
            console.log(
              `[MediaService] 🔄 Статус done при timeout, пытаемся получить результат: requestId=${requestId}`,
            );
            try {
              const savedFiles = await provider.getTaskResult(taskInfo.taskId);
              const processedFiles = await uploadImageFilesToImgbb(
                savedFiles,
                requestId,
                request.prompt
              );
              await saveFilesToDatabase(requestId, processedFiles, request.prompt);

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
              return;
            } catch (getResultError) {
              console.error(
                `[MediaService] ❌ Ошибка получения результата при timeout: requestId=${requestId}:`,
                getResultError instanceof Error ? getResultError.message : getResultError,
              );
            }
          }
        } catch (statusError) {
          console.error(
            `[MediaService] ❌ Ошибка проверки финального статуса при timeout: requestId=${requestId}:`,
            statusError instanceof Error ? statusError.message : statusError,
          );
        }
      }
    }
  } catch (error) {
    console.error(
      `[MediaService] ❌ Ошибка при проверке финального статуса: requestId=${requestId}:`,
      error instanceof Error ? error.message : error,
    );
  }

  // Помечаем как FAILED
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
      status: 'FAILED',
      errorMessage: formattedErrorMessage,
    },
  });

  activePollingTasks.delete(requestId);
}

// Вспомогательная функция для задержки
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
