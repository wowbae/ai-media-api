// Интерфейсы для абстракции провайдеров медиа-генерации
import type { MediaModel } from "@prisma/client";
import type { SavedFileInfo } from "../file.service";

// Реэкспорт MediaModelConfig из config.ts (единственный источник истины)
export type { MediaModelConfig, MediaProviderType } from "../config";

// Параметры запроса на генерацию
export interface GenerateParams {
  requestId: number;
  prompt: string;
  model: MediaModel;
  inputFiles?: string[];
  aspectRatio?:
    | "1:1"
    | "4:3"
    | "3:4"
    | "9:16"
    | "16:9"
    | "2:3"
    | "3:2"
    | "21:9";
  quality?: "1k" | "2k" | "4k" | "LOW" | "MEDIUM" | "HIGH" | "ULTRA";
  videoQuality?: "480p" | "720p" | "1080p";
  duration?: number;
  ar?: "16:9" | "9:16"; // Формат видео для Veo (передается как ar в теле запроса)
  sound?: boolean; // Звук для Kling 2.6
  outputFormat?: "png" | "jpg" | "jpeg"; // Формат выходного изображения для Nano Banana Pro
  negativePrompt?: string; // Негативный промпт для Imagen4 и Kling 2.5 Turbo Pro
  seed?: string | number; // Seed для Imagen4
  cfgScale?: number; // CFG scale для Kling 2.5 Turbo Pro
  tailImageUrl?: string; // Tail frame image для Kling 2.5 Turbo Pro (image-to-video)
  // Параметры для ElevenLabs Multilingual v2
  voice?: string; // Голос для TTS (по умолчанию "Rachel")
  stability?: number; // Стабильность (0-1, по умолчанию 0.5)
  similarityBoost?: number; // Усиление сходства (0-1, по умолчанию 0.75)
  speed?: number; // Скорость (0.5-2, по умолчанию 1)
  languageCode?: string; // Код языка (опционально)
}

// Результат создания задачи (для async провайдеров)
export interface TaskCreatedResult {
  taskId: string;
  status: "pending" | "processing";
}

// Результат проверки статуса задачи
export interface TaskStatusResult {
  status: "pending" | "processing" | "done" | "failed";
  url?: string;
  error?: string;
}

// Маппинг статусов провайдеров на внутренние (общий для gptunnel и midjourney)
export const PROVIDER_STATUS_MAP: Record<string, TaskStatusResult["status"]> = {
  idle: "pending",
  processing: "processing",
  done: "done",
  failed: "failed",
};

// Абстрактный интерфейс провайдера медиа-генерации
export interface MediaProvider {
  readonly name: string;
  readonly isAsync: boolean;
  generate(
    params: GenerateParams,
  ): Promise<SavedFileInfo[] | TaskCreatedResult>;
  checkTaskStatus?(taskId: string): Promise<TaskStatusResult>;
  getTaskResult?(taskId: string): Promise<SavedFileInfo[]>;
}

// Конфигурация провайдера
export interface ProviderConfig {
  apiKey: string;
  baseURL: string;
  defaultHeaders?: Record<string, string>;
}

// Тип для проверки является ли результат async
export function isTaskCreatedResult(
  result: SavedFileInfo[] | TaskCreatedResult,
): result is TaskCreatedResult {
  return "taskId" in result && "status" in result;
}
