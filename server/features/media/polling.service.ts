// Сервис для polling статуса async задач генерации
// Отвечает за проверку статуса задач у провайдеров и обновление БД
import type { MediaModel } from "./interfaces";
import { prisma } from "prisma/client";
import { getProviderManager } from "./providers";
import { formatErrorMessage } from "./error-utils";
import {
  checkInitialRequestStatus,
  isPollingActive,
  getRequestWithChat,
  checkProviderTaskStatus,
  handleTaskCompleted,
  handleTaskFailed,
  handlePollingError,
} from "./polling.utils";

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
 * Проверяет статус задачи и обновляет БД при завершении
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

  // Проверяем начальный статус запроса
  const { shouldSkip } = await checkInitialRequestStatus(requestId);
  if (shouldSkip) return;

  // Первая задержка перед началом polling (70 секунд)
  console.log(
    `[MediaService] ⏳ Ожидание ${POLLING_INITIAL_DELAY / 1000} секунд перед первым чеком статуса: requestId=${requestId}`,
  );
  await sleep(POLLING_INITIAL_DELAY);

  while (Date.now() - startTime < MAX_POLLING_TIME) {
    // Проверяем, не была ли задача отменена
    if (!isPollingActive(requestId)) {
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
      const request = await getRequestWithChat(requestId);

      if (!request) {
        console.error(`[MediaService] Request не найден: ${requestId}`);
        activePollingTasks.delete(requestId);
        return;
      }

      const requestModel = request.model || request.chat.model;
      const provider = providerManager.getProvider(requestModel as MediaModel);

      if (!provider.checkTaskStatus) {
        throw new Error(
          `Провайдер ${provider.name} не поддерживает checkTaskStatus`,
        );
      }

      const status = await checkProviderTaskStatus(provider.name, requestModel as MediaModel, taskId);

      console.log(`[MediaService] Polling статус: requestId=${requestId}`, {
        status: status.status,
        hasUrl: !!status.url,
        error: status.error || undefined,
      });

      if (status.status === "done") {
        await handleTaskCompleted(requestId, taskId, providerName, requestModel as MediaModel, prompt);
        return;
      }

      if (status.status === "failed") {
        await handleTaskFailed(requestId, taskId, status, requestModel as MediaModel, provider.name);
        return;
      }

      // pending или processing - продолжаем polling
      await sleep(POLLING_INTERVAL);
    } catch (error) {
      const shouldContinue = await handlePollingError(requestId, error, providerName, startTime, MAX_POLLING_TIME);
      if (!shouldContinue) return;
    }
  }

  // Timeout - проверяем финальный статус
  await handlePollingTimeout(requestId, providerName, prompt);
}

/**
 * Обработка timeout polling
 * Проверяет финальный статус задачи после истечения времени ожидания
 */
async function handlePollingTimeout(
  requestId: number,
  providerName: string,
  prompt: string
): Promise<void> {
  console.warn(`[MediaService] ⏱️ Timeout polling: requestId=${requestId}, проверяем финальный статус...`);

  try {
    const request = await getRequestWithChat(requestId);
    if (!request) {
      console.error(`[MediaService] Request не найден при timeout: ${requestId}`);
      activePollingTasks.delete(requestId);
      return;
    }

    const requestModel = request.model || request.chat.model;
    const providerManager = getProviderManager();
    const provider = providerManager.getProvider(requestModel as MediaModel);

    if (provider.checkTaskStatus) {
      const taskInfo = activePollingTasks.get(requestId);
      if (taskInfo) {
        try {
          const finalStatus = await provider.checkTaskStatus(taskInfo.taskId);
          console.log(
            `[MediaService] Финальный статус при timeout: requestId=${requestId}`,
            { status: finalStatus.status, hasUrl: !!finalStatus.url },
          );

          if (finalStatus.status === "done" && provider.getTaskResult) {
            console.log(
              `[MediaService] 🔄 Статус done при timeout, пытаемся получить результат: requestId=${requestId}`,
            );
            await handleTaskCompleted(requestId, taskInfo.taskId, providerName, requestModel as MediaModel, prompt);
            return;
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
  const taskInfo = activePollingTasks.get(requestId);
  const formattedErrorMessage = formatErrorMessage(
    "Превышено время ожидания генерации",
    taskInfo?.model || null,
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
