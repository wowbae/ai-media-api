// Базовые типы и конфигурация для Redux API
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// URL API сервера
export const API_BASE_URL = "http://localhost:4000/api/media";

// ==================== Базовые типы ====================

export type MediaModel =
  | "NANO_BANANA"
  | "MIDJOURNEY"
  | "VEO_3_1_FAST"
  | "NANO_BANANA_PRO"
  | "SORA_2"
  | "VEO_3_1";

export type MediaType = "IMAGE" | "VIDEO" | "AUDIO";
export type RequestStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
export type MediaProviderType =
  | "openrouter"
  | "gptunnel"
  | "laozhang"
  | "kieai";

// ==================== Интерфейсы сущностей ====================

export interface MediaChat {
  id: number;
  name: string;
  model: MediaModel;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  _count?: {
    files: number;
    requests: number;
  };
}

export interface MediaRequest {
  id: number;
  chatId: number;
  prompt: string;
  model: MediaModel | null; // Модель, использованная для этого запроса
  status: RequestStatus;
  inputFiles: string[];
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
  files: MediaFile[];
}

export interface MediaFile {
  id: number;
  requestId: number;
  type: MediaType;
  filename: string;
  path: string;
  previewPath: string | null;
  size: number;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface MediaChatWithRequests extends MediaChat {
  requests: MediaRequest[];
}

// Информация о модели с провайдером
export interface ModelInfo {
  key: string;
  name: string;
  types: string[];
  supportsImageInput: boolean;
  provider: MediaProviderType;
}

// ==================== Интерфейсы запросов ====================

export interface CreateChatRequest {
  name: string;
  model?: MediaModel;
  settings?: Record<string, unknown>;
}

export interface UpdateChatRequest {
  id: number;
  name?: string;
  model?: MediaModel;
  settings?: Record<string, unknown>;
}

export interface GenerateMediaRequest {
  chatId: number;
  prompt: string;
  model?: MediaModel;
  inputFiles?: string[];
  format?: "1:1" | "9:16" | "16:9";
  quality?: "1k" | "2k" | "4k";
  videoQuality?: "480p" | "720p" | "1080p";
  duration?: number;
  ar?: "16:9" | "9:16"; // Формат видео для Veo
  sound?: boolean; // Звук для Kling 2.6
  outputFormat?: "png" | "jpg"; // Формат выходного файла для Nano Banana Pro (Kie.ai)
}

export interface GenerateMediaResponse {
  requestId: number;
  status: RequestStatus;
  message: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

// ==================== Базовый API ====================

export const baseApi = createApi({
  reducerPath: "mediaApi",
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
  }),
  tagTypes: ["Chat", "Request", "File", "Model"],
  // Настройки для оптимистичного обновления
  keepUnusedDataFor: 60, // Хранить неиспользуемые данные 60 секунд
  // Показывать кешированные данные сразу, обновлять в фоне если старше 10 секунд
  refetchOnMountOrArgChange: 10,
  refetchOnFocus: true, // Обновлять при фокусе окна для актуальности данных
  refetchOnReconnect: true, // Обновлять при восстановлении соединения
  endpoints: () => ({}),
});
