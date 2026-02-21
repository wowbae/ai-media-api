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
    model: MediaModel | null;
    costUsd?: number | null;
    costTokens?: number | null;
    status: RequestStatus;
    inputFiles: string[];
    errorMessage: string | null;
    createdAt: string;
    completedAt: string | null;
    seed: string | null;
    settings?: Record<string, unknown>;
    files: MediaFile[];
}

export interface MediaFile {
    id: number;
    requestId: number;
    type: MediaType;
    filename: string;
    path: string | null;
    url: string | null;
    previewPath: string | null;
    previewUrl: string | null;
    size: number | null;
    width: number | null;
    height: number | null;
    createdAt: string;
}

export interface MediaChatWithRequests extends MediaChat {
    requests: MediaRequest[];
}

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
    ar?: '16:9' | '9:16';
    generationType?: 'TEXT_2_VIDEO' | 'FIRST_AND_LAST_FRAMES_2_VIDEO' | 'REFERENCE_2_VIDEO' | 'EXTEND_VIDEO';
    originalTaskId?: string;
    sound?: boolean;
    fixedLens?: boolean;
    outputFormat?: 'png' | 'jpg';
    negativePrompt?: string;
    seed?: string | number;
    cfgScale?: number;
    tailImageUrl?: string;
    voice?: string;
    stability?: number;
    similarityBoost?: number;
    speed?: number;
    languageCode?: string;
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

// ==================== Базовый query ====================

/**
 * Универсальная обертка для baseQuery с обработкой ошибок
 * @param baseUrl - Базовый URL API (по умолчанию API_BASE_URL)
 */
export async function baseQueryWithErrorHandling(
    args: any,
    api: any,
    extraOptions: any,
    baseUrl?: string
) {
    const result = await fetchBaseQuery({
        baseUrl: baseUrl || API_BASE_URL,
        prepareHeaders: createAuthHeaders,
    })(args, api, extraOptions);

    // Обработка ошибок 401 (Unauthorized)
    if (result.error && 'status' in result.error && result.error.status === 401) {
        const url = typeof args === 'string' ? args : args?.url || '';
        if (!url.includes('/auth/me')) {
            handleSessionTimeout();
        }
    }

    return result;
}

export const baseApi = createApi({
    reducerPath: 'mediaApi',
    baseQuery: baseQueryWithErrorHandling,
    tagTypes: ['Chat', 'Request', 'File', 'Model'],
    keepUnusedDataFor: 60,
    refetchOnMountOrArgChange: 10,
    refetchOnFocus: true,
    refetchOnReconnect: true,
    endpoints: () => ({}),
});
