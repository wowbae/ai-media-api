// Базовые типы и конфигурация для Redux API
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { createAuthHeaders, handleSessionTimeout } from './utils';

// URL API сервера
export const API_BASE_URL = 'http://localhost:4000/api/media';

// ==================== Базовые типы ====================

export type MediaModel =
    | 'NANO_BANANA_OPENROUTER'
    | 'MIDJOURNEY'
    | 'VEO_3_1_FAST_KIEAI'
    | 'NANO_BANANA_PRO_LAOZHANG'
    | 'SORA_2'
    | 'VEO_3_1_KIEAI'
    | 'KLING_2_6_KIEAI'
    | 'KLING_2_5_TURBO_PRO_KIEAI'
    | 'NANO_BANANA_PRO_KIEAI'
    | 'IMAGEN4_KIEAI'
    | 'IMAGEN4_ULTRA_KIEAI'
    | 'SEEDREAM_4_5_KIEAI'
    | 'SEEDREAM_4_5_EDIT_KIEAI'
    | 'ELEVENLABS_MULTILINGUAL_V2_KIEAI'
    | 'KLING_VIDEO_O1_WAVESPEED'
    | 'SEEDANCE_1_5_PRO_KIEAI';

export type MediaType = 'IMAGE' | 'VIDEO' | 'AUDIO';
export type RequestStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type MediaProviderType =
    | 'openrouter'
    | 'gptunnel'
    | 'laozhang'
    | 'kieai'
    | 'wavespeed';

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
    costUsd?: number | null;
    costTokens?: number | null;
    status: RequestStatus;
    inputFiles: string[];
    errorMessage: string | null;
    createdAt: string;
    completedAt: string | null;
    seed: string | null;
    settings?: Record<string, unknown>; // Параметры запроса для повторения (format, quality, duration, sound, и т.д.)
    files: MediaFile[];
}

export interface MediaFile {
    id: number;
    requestId: number;
    type: MediaType;
    filename: string;
    path: string | null;
    url: string | null; // URL на imgbb (для IMAGE, используется для отправки в нейросеть)
    previewPath: string | null;
    previewUrl: string | null; // URL превью на imgbb (для IMAGE, создается асинхронно)
    size: number | null;
    width: number | null;
    height: number | null;
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
    promptLimit: number;
}

export type PricingMap = Record<
    MediaModel,
    {
        usd: number;
        tokens: number;
    }
>;

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
    format?: '1:1' | '4:3' | '3:4' | '9:16' | '16:9' | '2:3' | '3:2' | '21:9';
    quality?: '1k' | '2k' | '4k';
    videoQuality?: '480p' | '720p' | '1080p';
    duration?: number;
    ar?: '16:9' | '9:16'; // Формат видео для Veo
    generationType?: 'TEXT_2_VIDEO' | 'FIRST_AND_LAST_FRAMES_2_VIDEO' | 'REFERENCE_2_VIDEO' | 'EXTEND_VIDEO'; // Режим генерации для Veo 3.1
    originalTaskId?: string; // taskId оригинального видео для режима EXTEND_VIDEO
    sound?: boolean; // Звук для Kling 2.6 / generate_audio для Seedance 1.5 Pro
    fixedLens?: boolean; // Флаг fixed_lens для Seedance 1.5 Pro
    outputFormat?: 'png' | 'jpg'; // Формат выходного файла для Nano Banana Pro (Kie.ai)
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

// Обертка для baseQuery с обработкой ошибок
const baseQueryWithErrorHandling = async (args: any, api: any, extraOptions: any) => {
    const result = await fetchBaseQuery({
        baseUrl: API_BASE_URL,
        prepareHeaders: createAuthHeaders,
    })(args, api, extraOptions);

    // Обработка ошибок 401 (Unauthorized)
    if (result.error && 'status' in result.error && result.error.status === 401) {
        // Перенаправляем на логин только если это не запрос /auth/me (чтобы не спамить при отсутствии токена)
        const url = typeof args === 'string' ? args : args?.url || '';
        if (!url.includes('/auth/me')) {
            handleSessionTimeout();
        }
    }

    return result;
};

export const baseApi = createApi({
    reducerPath: 'mediaApi',
    baseQuery: baseQueryWithErrorHandling,
    tagTypes: ['Chat', 'Request', 'File', 'Model'],
    // Настройки для оптимистичного обновления
    keepUnusedDataFor: 60, // Хранить неиспользуемые данные 60 секунд
    // Показывать кешированные данные сразу, обновлять в фоне если старше 10 секунд
    refetchOnMountOrArgChange: 10,
    refetchOnFocus: true, // Обновлять при фокусе окна для актуальности данных
    refetchOnReconnect: true, // Обновлять при восстановлении соединения
    endpoints: () => ({}),
});
