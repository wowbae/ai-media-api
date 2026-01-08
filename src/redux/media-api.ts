// RTK Query API для медиа-генерации
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// Типы для API
export interface MediaChat {
    id: number;
    name: string;
    model: MediaModel;
    settings: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
    _count?: {
        requests: number;
    };
}

export interface MediaRequest {
    id: number;
    chatId: number;
    prompt: string;
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

export type MediaModel = 'NANO_BANANA' | 'KLING' | 'MIDJOURNEY';
export type MediaType = 'IMAGE' | 'VIDEO' | 'AUDIO';
export type RequestStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface ModelInfo {
    key: string;
    name: string;
    types: string[];
    supportsImageInput: boolean;
}

// Интерфейсы запросов
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
    format?: '9:16' | '16:9'; // Формат изображения для NANO_BANANA
    quality?: '1k' | '2k' | '4k'; // Качество изображения для NANO_BANANA
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

// API
export const mediaApi = createApi({
    reducerPath: 'mediaApi',
    baseQuery: fetchBaseQuery({
        baseUrl: 'http://localhost:4000/api/media',
    }),
    tagTypes: ['Chat', 'Request', 'File', 'Model'],

    endpoints: (build) => ({
        // ==================== Чаты ====================

        // Получить все чаты
        getChats: build.query<MediaChat[], void>({
            query: () => '/chats',
            transformResponse: (response: ApiResponse<MediaChat[]>) => response.data,
            providesTags: (result) =>
                result
                    ? [
                          ...result.map(({ id }) => ({ type: 'Chat' as const, id })),
                          { type: 'Chat', id: 'LIST' },
                      ]
                    : [{ type: 'Chat', id: 'LIST' }],
        }),

        // Получить чат по ID
        getChat: build.query<MediaChatWithRequests, number>({
            query: (id) => `/chats/${id}`,
            transformResponse: (response: ApiResponse<MediaChatWithRequests>) => response.data,
            providesTags: (result, error, id) => [{ type: 'Chat', id }],
        }),

        // Создать чат
        createChat: build.mutation<MediaChat, CreateChatRequest>({
            query: (body) => ({
                url: '/chats',
                method: 'POST',
                body,
            }),
            transformResponse: (response: ApiResponse<MediaChat>) => response.data,
            invalidatesTags: [{ type: 'Chat', id: 'LIST' }],
        }),

        // Обновить чат
        updateChat: build.mutation<MediaChat, UpdateChatRequest>({
            query: ({ id, ...body }) => ({
                url: `/chats/${id}`,
                method: 'PATCH',
                body,
            }),
            transformResponse: (response: ApiResponse<MediaChat>) => response.data,
            invalidatesTags: (result, error, { id }) => [
                { type: 'Chat', id },
                { type: 'Chat', id: 'LIST' },
            ],
        }),

        // Удалить чат
        deleteChat: build.mutation<void, number>({
            query: (id) => ({
                url: `/chats/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: [{ type: 'Chat', id: 'LIST' }],
        }),

        // ==================== Генерация ====================

        // Отправить запрос на генерацию
        generateMedia: build.mutation<GenerateMediaResponse, GenerateMediaRequest>({
            query: (body) => {
                console.log('[RTK Query] generateMedia mutation вызван:', {
                    chatId: body.chatId,
                    prompt: body.prompt?.substring(0, 50),
                    model: body.model,
                    format: body.format,
                    quality: body.quality,
                    timestamp: new Date().toISOString(),
                });
                return {
                    url: '/generate',
                    method: 'POST',
                    body,
                };
            },
            transformResponse: (response: ApiResponse<GenerateMediaResponse>) => {
                console.log('[RTK Query] generateMedia response получен:', response.data);
                return response.data;
            },
            invalidatesTags: (result, error, { chatId }) => [
                { type: 'Chat', id: chatId },
                { type: 'Request', id: result?.requestId || 'LIST' },
            ],
        }),

        // ==================== Запросы ====================

        // Получить статус запроса
        getRequest: build.query<MediaRequest, number>({
            query: (id) => `/requests/${id}`,
            transformResponse: (response: ApiResponse<MediaRequest>) => {
                console.log('[RTK Query] getRequest response:', {
                    id: response.data.id,
                    status: response.data.status,
                    filesCount: response.data.files.length,
                });
                return response.data;
            },
            providesTags: (result, error, id) => [
                { type: 'Request', id },
                ...(result?.files.map((f) => ({ type: 'File' as const, id: f.id })) || []),
            ],
        }),

        // ==================== Файлы ====================

        // Получить все файлы
        getFiles: build.query<
            PaginatedResponse<MediaFile & { request: { prompt: string; chat: { name: string } } }>,
            { page?: number; limit?: number }
        >({
            query: ({ page = 1, limit = 20 }) => `/files?page=${page}&limit=${limit}`,
            transformResponse: (
                response: ApiResponse<MediaFile[]> & {
                    pagination: PaginatedResponse<unknown>['pagination'];
                }
            ) => ({
                data: response.data as (MediaFile & {
                    request: { prompt: string; chat: { name: string } };
                })[],
                pagination: response.pagination,
            }),
            providesTags: (result) =>
                result
                    ? [
                          ...result.data.map(({ id }) => ({ type: 'File' as const, id })),
                          { type: 'File', id: 'LIST' },
                      ]
                    : [{ type: 'File', id: 'LIST' }],
        }),

        // Удалить файл
        deleteFile: build.mutation<void, number>({
            query: (id) => ({
                url: `/files/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: [{ type: 'File', id: 'LIST' }],
        }),

        // ==================== Модели ====================

        // Получить доступные модели
        getModels: build.query<ModelInfo[], void>({
            query: () => '/models',
            transformResponse: (response: ApiResponse<ModelInfo[]>) => response.data,
            providesTags: [{ type: 'Model', id: 'LIST' }],
        }),
    }),
});

// Экспортируем хуки
export const {
    useGetChatsQuery,
    useGetChatQuery,
    useCreateChatMutation,
    useUpdateChatMutation,
    useDeleteChatMutation,
    useGenerateMediaMutation,
    useGetRequestQuery,
    useGetFilesQuery,
    useDeleteFileMutation,
    useGetModelsQuery,
} = mediaApi;

