// Интерфейсы для Wavespeed AI API
// Документация REST API: https://wavespeed.ai/docs/rest-api

// Конфигурация Wavespeed провайдера
export interface WavespeedConfig {
  apiKey: string;
  baseURL?: string; // По умолчанию https://api.wavespeed.ai/api/v3
}

// Ответ от REST API при создании задачи
// Согласно документации: https://wavespeed.ai/docs/submit-task
export interface WavespeedSubmitResponse {
  code: number;
  message: string;
  data: {
    id: string; // Task ID (например: "088b5273b8f84fe0b0a313dcde55475d")
    status: string; // "created" | "processing" | "completed" | "failed"
    model?: string;
    urls?: {
      get: string; // URL для получения результата
    };
    created_at?: string;
  };
}

// Ответ от REST API при получении результата
// Согласно документации: https://wavespeed.ai/docs/get-result
export interface WavespeedResultResponse {
  code: number;
  message: string;
  data: {
    id: string;
    status: string; // "created" | "processing" | "completed" | "failed"
    model?: string;
    outputs?: string[]; // Массив URL результатов (только когда status === "completed")
    error?: string; // Сообщение об ошибке (только когда status === "failed")
    timings?: {
      inference?: number; // Время генерации в миллисекундах
    };
    created_at?: string;
  };
}

// Маппинг статусов Wavespeed на внутренние статусы
export const WAVESPEED_STATUS_MAP: Record<string, "pending" | "processing" | "done" | "failed"> = {
  idle: "pending",
  pending: "pending",
  created: "pending",
  processing: "processing",
  generating: "processing",
  done: "done",
  completed: "done",
  success: "done",
  failed: "failed",
  error: "failed",
};
