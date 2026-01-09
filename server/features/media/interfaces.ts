// Интерфейсы для медиа-генерации
import { MediaModel, MediaType, RequestStatus } from "@prisma/client";

export interface GenerateMediaRequest {
  chatId: number;
  prompt: string;
  model?: MediaModel;
  inputFiles?: string[]; // base64 или URL файлов для image-to-image
  format?: "1:1" | "9:16" | "16:9"; // Формат изображения для NANO_BANANA
  quality?: "1k" | "2k" | "4k"; // Качество изображения для NANO_BANANA
  videoQuality?: "480p" | "720p" | "1080p"; // Качество видео для видео-моделей
  duration?: number; // Длина видео в секундах (1-20) для видео-моделей
  ar?: "16:9" | "9:16"; // Формат видео для Veo
  sound?: boolean; // Звук для Kling 2.6
  outputFormat?: "png" | "jpg"; // Формат выходного файла для Nano Banana Pro (Kie.ai)
}

export interface GenerateMediaResponse {
  requestId: number;
  status: RequestStatus;
  message: string;
}

export interface MediaRequestWithFiles {
  id: number;
  chatId: number;
  prompt: string;
  status: RequestStatus;
  inputFiles: string[];
  errorMessage: string | null;
  createdAt: Date;
  completedAt: Date | null;
  files: MediaFileInfo[];
}

export interface MediaFileInfo {
  id: number;
  type: MediaType;
  filename: string;
  path: string;
  previewPath: string | null;
  size: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface CreateChatRequest {
  name: string;
  model?: MediaModel;
  settings?: Record<string, unknown>;
}

export interface UpdateChatRequest {
  name?: string;
  model?: MediaModel;
  settings?: Record<string, unknown>;
}

export interface MediaChatWithRequests {
  id: number;
  name: string;
  model: MediaModel;
  settings: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  requests: MediaRequestWithFiles[];
}

// OpenRouter API типы
export interface OpenRouterMessage {
  role: "user" | "assistant" | "system";
  content: string | OpenRouterContent[];
}

export interface OpenRouterContent {
  type: "text" | "image_url";
  text?: string;
  image_url?: {
    url: string;
  };
}

export interface OpenRouterImageResponse {
  id: string;
  choices: {
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
  }[];
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Для генерации изображений Gemini возвращает base64
export interface GeminiImagePart {
  inlineData?: {
    mimeType: string;
    data: string; // base64
  };
  text?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
