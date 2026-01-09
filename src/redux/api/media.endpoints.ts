// Эндпоинты для работы с медиа (чаты, файлы, запросы)
import {
    baseApi,
    type ApiResponse,
    type MediaChat,
    type MediaChatWithRequests,
    type MediaRequest,
    type MediaFile,
    type CreateChatRequest,
    type UpdateChatRequest,
    type GenerateMediaRequest,
    type GenerateMediaResponse,
    type PaginatedResponse,
} from './base';

export const mediaEndpoints = baseApi.injectEndpoints({
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
        getChat: build.query<
            MediaChatWithRequests,
            { id: number; limit?: number }
        >({
            query: ({ id, limit }) => {
                const url = `/chats/${id}`;
                const params = limit !== undefined ? `?limit=${limit}` : '';
                return url + params;
            },
            transformResponse: (response: ApiResponse<MediaChatWithRequests>) =>
                response.data,
            providesTags: (result, _error, { id }) => [
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
            invalidatesTags: (_result, _error, { id }) => [
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
            async onQueryStarted(chatId, { dispatch, queryFulfilled }) {
                // Оптимистично удаляем чат из списка
                const patchResult = dispatch(
                    mediaEndpoints.util.updateQueryData('getChats', undefined, (draft) => {
                        if (draft) {
                            const index = draft.findIndex((chat) => chat.id === chatId);
                            if (index !== -1) {
                                draft.splice(index, 1);
                            }
                        }
                    })
                );

                try {
                    await queryFulfilled;
                } catch {
                    // Откатываем изменения при ошибке
                    patchResult.undo();
                }
            },
            invalidatesTags: (_result, _error, chatId) => [
                { type: 'Chat', id: chatId },
                { type: 'Chat', id: 'LIST' },
            ],
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
            invalidatesTags: (result, _error, { chatId }) => [
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
            invalidatesTags: (result, _error, { chatId }) => [
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
            providesTags: (result, _error, id) => [
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
            async onQueryStarted(fileId, { dispatch, queryFulfilled, getState }) {
                // Получаем все кешированные запросы
                const state = getState() as {
                    [key: string]: {
                        queries: Record<
                            string,
                            {
                                endpointName?: string;
                                data?: MediaChatWithRequests | MediaRequest;
                                status: string;
                                originalArgs?: { id: number; limit?: number } | number;
                            }
                        >;
                    };
                };
                const apiState = state[baseApi.reducerPath];
                const queries = apiState?.queries || {};

                // Находим чат, в котором есть удаляемый файл, и ID чата
                let chatId: number | null = null;
                const chatPatches: Array<{
                    undo: () => void;
                    chatId: number;
                    args: { id: number; limit?: number };
                }> = [];

                // Находим все запросы getChat и оптимистично удаляем файл
                for (const [queryKey, queryData] of Object.entries(queries)) {
                    // Проверяем тип запроса через endpointName или queryKey
                    const isGetChat =
                        queryData?.endpointName === 'getChat' ||
                        queryKey.includes('"getChat"') ||
                        queryKey.startsWith('getChat(');

                    if (
                        isGetChat &&
                        queryData?.data &&
                        queryData.status === 'fulfilled' &&
                        queryData.originalArgs &&
                        typeof queryData.originalArgs === 'object' &&
                        'id' in queryData.originalArgs
                    ) {
                        const chat = queryData.data as MediaChatWithRequests;
                        // Проверяем, есть ли этот файл в чате
                        const hasFile = chat.requests.some((req) =>
                            req.files.some((f) => f.id === fileId)
                        );

                        if (hasFile) {
                            if (!chatId) {
                                chatId = chat.id;
                            }

                            const args = queryData.originalArgs as {
                                id: number;
                                limit?: number;
                            };

                            // Оптимистично удаляем файл из кеша
                            const patchResult = dispatch(
                                mediaEndpoints.util.updateQueryData(
                                    'getChat',
                                    args,
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
                            chatPatches.push({
                                undo: patchResult.undo,
                                chatId: chat.id,
                                args,
                            });
                        }
                    }

                    // Также обновляем getRequest, если файл был в запросе
                    const isGetRequest =
                        queryData?.endpointName === 'getRequest' ||
                        queryKey.includes('"getRequest"') ||
                        queryKey.startsWith('getRequest(');

                    if (
                        isGetRequest &&
                        queryData?.data &&
                        queryData.status === 'fulfilled' &&
                        typeof queryData.originalArgs === 'number'
                    ) {
                        const request = queryData.data as MediaRequest;
                        if (
                            request &&
                            'files' in request &&
                            Array.isArray(request.files) &&
                            request.files.some((f: MediaFile) => f.id === fileId)
                        ) {
                            const requestId = queryData.originalArgs;
                            dispatch(
                                mediaEndpoints.util.updateQueryData(
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

                // Оптимистично обновляем список чатов (для счетчиков файлов)
                let chatsPatch: { undo: () => void } | null = null;
                if (chatId) {
                    chatsPatch = dispatch(
                        mediaEndpoints.util.updateQueryData(
                            'getChats',
                            undefined,
                            (draft) => {
                                if (draft) {
                                    const chat = draft.find((c) => c.id === chatId);
                                    if (chat && chat._count && chat._count.files > 0) {
                                        chat._count.files -= 1;
                                    }
                                }
                            }
                        )
                    );
                }

                // Ожидаем завершения запроса и откатываем изменения в случае ошибки
                try {
                    await queryFulfilled;
                } catch {
                    // В случае ошибки откатываем все оптимистичные обновления
                    chatPatches.forEach((patch) => patch.undo());
                    chatsPatch?.undo();
                }
            },
            invalidatesTags: (_result, _error, fileId) => [
                { type: 'File', id: fileId },
                { type: 'File', id: 'LIST' },
                { type: 'Request', id: 'LIST' },
            ],
        }),
    }),
    overrideExisting: false,
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
} = mediaEndpoints;
