// Сервис для обработки завершения задач генерации
// Вызывается при получении результата от провайдера (webhook или manual check)
import type { TaskStatusResult } from "./providers";
import type { MediaModel } from "./interfaces";
import { handleTaskCompletion, handleTaskFailure } from "./media-processor";

/**
 * Обработать завершение задачи (успех)
 * Вызывается когда провайдер сообщил о завершении
 */
export async function handleTaskCompleted(
    requestId: number,
    taskId: string,
    model: MediaModel,
    prompt: string,
    status?: TaskStatusResult,
): Promise<void> {
    await handleTaskCompletion(requestId, taskId, model, prompt, status);
}

/**
 * Обработать неудачное завершение задачи
 */
export async function handleTaskFailed(
    requestId: number,
    taskId: string,
    status: TaskStatusResult,
    model: MediaModel,
): Promise<void> {
    await handleTaskFailure(requestId, taskId, status, model);
}
