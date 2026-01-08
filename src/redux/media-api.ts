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
            transformResponse: (response: ApiResponse<MediaChat[]>) =>
                response.data,
            providesTags: (result) =>
                result
                    ? [
                          ...result.map(({ id }) => ({
                              type: 'Chat' as const,
                              id,
                          })),
                          { type: 'Chat', id: 'LIST' },
                      ]
                    : [{ type: 'Chat', id: 'LIST' }],
        }),

        // Получить чат по ID
        getChat: build.query<MediaChatWithRequests, number>({
            query: (id) => `/chats/${id}`,
            transformResponse: (response: ApiResponse<MediaChatWithRequests>) =>
                response.data,
            providesTags: (result, error, id) => [
                { type: 'Chat', id },
                // Добавляем File теги, чтобы при удалении файла чат обновлялся
                ...(result?.requests.flatMap((req) =>
                    req.files.map((file) => ({
                        type: 'File' as const,
                        id: file.id,
                    }))
                ) || []),
            ],
        }),

        // Создать чат
        createChat: build.mutation<MediaChat, CreateChatRequest>({
            query: (body) => ({
                url: '/chats',
                method: 'POST',
                body,
            }),
            transformResponse: (response: ApiResponse<MediaChat>) =>
                response.data,
            invalidatesTags: [{ type: 'Chat', id: 'LIST' }],
        }),

        // Обновить чат
        updateChat: build.mutation<MediaChat, UpdateChatRequest>({
            query: ({ id, ...body }) => ({
                url: `/chats/${id}`,
                method: 'PATCH',
                body,
            }),
            transformResponse: (response: ApiResponse<MediaChat>) =>
                response.data,
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
        generateMedia: build.mutation<
            GenerateMediaResponse,
            GenerateMediaRequest
        >({
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
            transformResponse: (
                response: ApiResponse<GenerateMediaResponse>
            ) => {
                console.log(
                    '[RTK Query] generateMedia response получен:',
                    response.data
                );
                return response.data;
            },
            invalidatesTags: (result, error, { chatId }) => [
                { type: 'Chat', id: chatId },
                { type: 'Request', id: result?.requestId || 'LIST' },
            ],
        }),

        // Тестовый режим генерации (использует последний файл из чата)
        generateMediaTest: build.mutation<
            GenerateMediaResponse,
            { chatId: number; prompt: string }
        >({
            query: (body) => {
                console.log(
                    '[RTK Query] 🧪 generateMediaTest mutation вызван (тестовый режим):',
                    {
                        chatId: body.chatId,
                        prompt: body.prompt?.substring(0, 50),
                        timestamp: new Date().toISOString(),
                    }
                );
                return {
                    url: '/generate-test',
                    method: 'POST',
                    body: {
                        chatId: body.chatId,
                        prompt: body.prompt,
                    },
                };
            },
            transformResponse: (
                response: ApiResponse<GenerateMediaResponse>
            ) => {
                console.log(
                    '[RTK Query] 🧪 generateMediaTest response получен (тестовый режим):',
                    response.data
                );
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
                    timestamp: new Date().toISOString(),
                });
                return response.data;
            },
            providesTags: (result, error, id) => [
                { type: 'Request', id },
                ...(result?.files.map((f) => ({
                    type: 'File' as const,
                    id: f.id,
                })) || []),
            ],
        }),

        // ==================== Файлы ====================

        // Получить все файлы
        getFiles: build.query<
            PaginatedResponse<
                MediaFile & {
                    request: { prompt: string; chat: { name: string } };
                }
            >,
            { page?: number; limit?: number }
        >({
            query: ({ page = 1, limit = 20 }) =>
                `/files?page=${page}&limit=${limit}`,
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
                          ...result.data.map(({ id }) => ({
                              type: 'File' as const,
                              id,
                          })),
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
            async onQueryStarted(
                fileId,
                { dispatch, queryFulfilled, getState }
            ) {
                // Оптимистичное обновление: удаляем файл из всех чатов в кеше
                const state = getState() as {
                    [key: string]: {
                        queries: Record<
                            string,
                            { data?: MediaChatWithRequests; status: string }
                        >;
                    };
                };
                const apiState = state[mediaApi.reducerPath];
                const queries = apiState?.queries || {};

                // Находим все запросы getChat и оптимистично удаляем файл
                const patches: Array<{
                    queryCacheKey: string;
                    chatId: number;
                }> = [];

                for (const [queryKey, queryData] of Object.entries(queries)) {
                    if (
                        queryKey.includes('getChat(') &&
                        queryData?.data &&
                        queryData.status === 'fulfilled'
                    ) {
                        const chat = queryData.data as MediaChatWithRequests;
                        // Проверяем, есть ли этот файл в чате
                        const hasFile = chat.requests.some((req) =>
                            req.files.some((f) => f.id === fileId)
                        );

                        if (hasFile) {
                            patches.push({
                                queryCacheKey: queryKey,
                                chatId: chat.id,
                            });

                            // Оптимистично удаляем файл из кеша
                            dispatch(
                                mediaApi.util.updateQueryData(
                                    'getChat',
                                    chat.id,
                                    (draft) => {
                                        if (draft?.requests) {
                                            draft.requests = draft.requests.map(
                                                (req) => ({
                                                    ...req,
                                                    files: req.files.filter(
                                                        (f) => f.id !== fileId
                                                    ),
                                                })
                                            );
                                        }
                                    }
                                )
                            );
                        }
                    }

                    // Также обновляем getRequest, если файл был в запросе
                    if (
                        queryKey.includes('getRequest(') &&
                        queryData?.data &&
                        queryData.status === 'fulfilled'
                    ) {
                        const request =
                            queryData.data as unknown as MediaRequest;
                        if (
                            request &&
                            'id' in request &&
                            'files' in request &&
                            Array.isArray(request.files) &&
                            request.files.some(
                                (f: MediaFile) => f.id === fileId
                            )
                        ) {
                            const requestId = request.id as number;
                            dispatch(
                                mediaApi.util.updateQueryData(
                                    'getRequest',
                                    requestId,
                                    (draft) => {
                                        if (draft?.files) {
                                            draft.files = draft.files.filter(
                                                (f) => f.id !== fileId
                                            );
                                        }
                                    }
                                )
                            );
                        }
                    }
                }

                // Ожидаем завершения запроса и откатываем изменения в случае ошибки
                try {
                    await queryFulfilled;
                } catch {
                    // В случае ошибки откатываем все оптимистичные обновления
                    for (const patch of patches) {
                        dispatch(
                            mediaApi.util.invalidateTags([
                                { type: 'Chat', id: patch.chatId },
                            ])
                        );
                    }
                }
            },
            invalidatesTags: (result, error, fileId) => [
                { type: 'File', id: fileId },
                { type: 'File', id: 'LIST' },
                { type: 'Request', id: 'LIST' },
                { type: 'Chat', id: 'LIST' },
            ],
        }),

        // ==================== Модели ====================

        // Получить доступные модели
        getModels: build.query<ModelInfo[], void>({
            query: () => '/models',
            transformResponse: (response: ApiResponse<ModelInfo[]>) =>
                response.data,
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
    useGenerateMediaTestMutation,
    useGetRequestQuery,
    useGetFilesQuery,
    useDeleteFileMutation,
    useGetModelsQuery,
} = mediaApi;
