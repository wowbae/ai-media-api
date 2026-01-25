// Интерфейсы для Wavespeed AI API
// Документация: https://wavespeed.ai/docs

// Конфигурация Wavespeed провайдера
export interface WavespeedConfig {
  apiKey: string;
  baseURL?: string; // Опционально, SDK использует свой baseURL
}

// Опции для вызова SDK
export interface WavespeedRunOptions {
  timeout?: number; // Максимальное время ожидания в секундах (по умолчанию 36000.0)
  pollInterval?: number; // Интервал проверки статуса в секундах (по умолчанию 1.0)
  enableSyncMode?: boolean; // Режим синхронного запроса без polling (по умолчанию false)
}

// Ответ от SDK wavespeed.run()
export interface WavespeedRunResponse {
  outputs?: string[]; // Массив URL результатов
  taskId?: string; // ID задачи (если async)
  status?: string; // Статус задачи
  [key: string]: unknown; // Дополнительные поля
}

// Маппинг статусов Wavespeed на внутренние статусы
export const WAVESPEED_STATUS_MAP: Record<string, "pending" | "processing" | "done" | "failed"> = {
  idle: "pending",
  pending: "pending",
  processing: "processing",
  generating: "processing",
  done: "done",
  completed: "done",
  success: "done",
  failed: "failed",
  error: "failed",
};
