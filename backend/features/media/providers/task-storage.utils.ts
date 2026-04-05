// Временное хранилище для результатов задач
// Используется для эмуляции async для sync провайдеров
import type { SavedFileInfo } from "../file.service";

interface TaskData {
  status: 'pending' | 'processing' | 'done' | 'failed';
  result?: SavedFileInfo[];
  error?: string;
  createdAt: number;
}

// Хранилище задач в памяти
const taskStorage = new Map<string, TaskData>();

// TTL для задач (1 час)
const TASK_TTL = 60 * 60 * 1000;

/**
 * Создать задачу во временном хранилище
 */
export function createTask(taskId: string): void {
  taskStorage.set(taskId, {
    status: 'pending',
    createdAt: Date.now(),
  });
}

/**
 * Обновить статус задачи
 */
export function updateTaskStatus(
  taskId: string,
  status: TaskData['status']
): void {
  const task = taskStorage.get(taskId);
  if (task) {
    task.status = status;
    taskStorage.set(taskId, task);
  }
}

/**
 * Завершить задачу с результатом
 */
export function completeTask(
  taskId: string,
  result: SavedFileInfo[]
): void {
  const task = taskStorage.get(taskId);
  if (task) {
    task.status = 'done';
    task.result = result;
    taskStorage.set(taskId, task);
  }
}

/**
 * Завершить задачу с ошибкой
 */
export function failTask(
  taskId: string,
  error: string
): void {
  const task = taskStorage.get(taskId);
  if (task) {
    task.status = 'failed';
    task.error = error;
    taskStorage.set(taskId, task);
  }
}

/**
 * Проверить статус задачи
 */
export function getTaskStatus(taskId: string): TaskData['status'] | undefined {
  const task = taskStorage.get(taskId);
  
  // Очистка старых задач
  if (task && Date.now() - task.createdAt > TASK_TTL) {
    taskStorage.delete(taskId);
    return undefined;
  }
  
  return task?.status;
}

/**
 * Получить результат задачи
 */
export function getTaskResult(taskId: string): SavedFileInfo[] | undefined {
  const task = taskStorage.get(taskId);
  
  // Очистка старых задач
  if (task && Date.now() - task.createdAt > TASK_TTL) {
    taskStorage.delete(taskId);
    return undefined;
  }
  
  return task?.result;
}

/**
 * Удалить задачу из хранилища
 */
export function deleteTask(taskId: string): void {
  taskStorage.delete(taskId);
}

/**
 * Очистить все старые задачи
 */
export function cleanupOldTasks(): void {
  const now = Date.now();
  for (const [taskId, task] of taskStorage.entries()) {
    if (now - task.createdAt > TASK_TTL) {
      taskStorage.delete(taskId);
    }
  }
}

// Запуск периодической очистки (каждые 10 минут)
setInterval(cleanupOldTasks, 10 * 60 * 1000);
