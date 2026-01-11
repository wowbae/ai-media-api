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
import {
    getApiState,
    findChatsWithFile,
    findRequestsWithFile,
    updateFileInChat,
    removeFileFromChat,
    updateFileInRequest,
    removeFileFromRequest,
} from './cache-utils';

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
            { id: number; limit?: number; includeInputFiles?: boolean }
        >({
            query: ({ id, limit, includeInputFiles }) => {
                const url = `/chats/${id}`;
                const params = new URLSearchParams();
                if (limit !== undefined)
                    params.append('limit', limit.toString());
                if (includeInputFiles)
                    params.append('includeInputFiles', 'true');
                const queryString = params.toString();
                return url + (queryString ? `?${queryString}` : '');
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
                    mediaEndpoints.util.updateQueryData(
                        'getChats',
                        undefined,
                        (draft) => {
                            if (draft) {
                                const index = draft.findIndex(
                                    (chat) => chat.id === chatId
                                );
                                if (index !== -1) {
                                    draft.splice(index, 1);
                                }
                            }
                        }
                    )
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
            // Инвалидируем кеш чата при успехе, чтобы немедленно обновить UI
            invalidatesTags: (result, _error, { chatId }) => [
                { type: 'Chat', id: chatId }, // Обновляем конкретный чат
                { type: 'Chat', id: 'LIST' }, // Обновляем список всех чатов (счетчики)
                { type: 'Request', id: result?.requestId || 'LIST' }, // Обновляем конкретный запрос
                { type: 'Request', id: 'LIST' }, // Обновляем список всех запросов
            ],
        }),

        // Тестовый режим генерации (использует последний файл из чата)
        generateMediaTest: build.mutation<
            GenerateMediaResponse,
            { chatId: number; prompt: string; seed?: string | number }
        >({
            query: (body) => {
                console.log(
                    '[RTK Query] 🧪 generateMediaTest mutation вызван (тестовый режим):',
                    {
                        chatId: body.chatId,
                        prompt: body.prompt?.substring(0, 50),
                        seed: body.seed,
                        timestamp: new Date().toISOString(),
                    }
                );
                return {
                    url: '/generate-test',
                    method: 'POST',
                    body: {
                        chatId: body.chatId,
                        prompt: body.prompt,
                        ...(body.seed !== undefined &&
                            body.seed !== null &&
                            body.seed !== '' && { seed: body.seed }),
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
            // Инвалидируем кеш чата при успехе, чтобы обновить список запросов
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
            { page?: number; limit?: number; chatId?: number }
        >({
            query: ({ page = 1, limit = 20, chatId }) => {
                const params = new URLSearchParams();
                params.append('page', page.toString());
                params.append('limit', limit.toString());
                if (chatId !== undefined) {
                    params.append('chatId', chatId.toString());
                }
                return `/files?${params.toString()}`;
            },
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
            providesTags: (result, _error, { chatId }) =>
                result
                    ? [
                          ...result.data.map(({ id }) => ({
                              type: 'File' as const,
                              id,
                          })),
                          { type: 'File', id: 'LIST' },
                          // Добавляем тег чата для инвалидации при изменении чата
                          ...(chatId !== undefined
                              ? [{ type: 'Chat' as const, id: chatId }]
                              : []),
                      ]
                    : [
                          { type: 'File', id: 'LIST' },
                          ...(chatId !== undefined
                              ? [{ type: 'Chat' as const, id: chatId }]
                              : []),
                      ],
        }),

        // Загрузить thumbnail для видео
        uploadThumbnail: build.mutation<
            { previewPath: string },
            { fileId: number; thumbnail: string }
        >({
            query: ({ fileId, thumbnail }) => ({
                url: `/files/${fileId}/thumbnail`,
                method: 'POST',
                body: { thumbnail },
            }),
            transformResponse: (
                response: ApiResponse<{ previewPath: string }>
            ) => response.data,
            // Оптимистичное обновление - сразу показываем превью
            async onQueryStarted(
                { fileId, thumbnail },
                { dispatch, queryFulfilled, getState }
            ) {
                const apiState = getApiState(getState, baseApi.reducerPath);
                if (!apiState) return;

                const queries = apiState.queries || {};
                const chatPatches: Array<{ undo: () => void }> = [];

                // Находим чаты с этим файлом
                const chatsWithFile = findChatsWithFile(queries, fileId);

                // Оптимистично обновляем previewPath (временно ставим thumbnail base64)
                for (const { args } of chatsWithFile) {
                    const patchResult = dispatch(
                        mediaEndpoints.util.updateQueryData(
                            'getChat',
                            args,
                            (draft) => {
                                updateFileInChat(draft, fileId, (file) => ({
                                    ...file,
                                    previewPath: `__pending__${thumbnail}`,
                                }));
                            }
                        )
                    );
                    chatPatches.push({ undo: patchResult.undo });
                }

                try {
                    const { data } = await queryFulfilled;
                    // При успехе - обновляем на реальный путь
                    for (const { args } of chatsWithFile) {
                        dispatch(
                            mediaEndpoints.util.updateQueryData(
                                'getChat',
                                args,
                                (draft) => {
                                    updateFileInChat(draft, fileId, (file) => ({
                                        ...file,
                                        previewPath: data.previewPath,
                                    }));
                                }
                            )
                        );
                    }
                } catch {
                    // Откатываем изменения при ошибке
                    chatPatches.forEach((patch) => patch.undo());
                }
            },
        }),

        // Загрузить файлы на imgbb (для inputFiles)
        uploadToImgbb: build.mutation<
            { urls: string[]; uploaded: number; total: number },
            { files: string[] }
        >({
            query: (body) => ({
                url: '/upload-to-imgbb',
                method: 'POST',
                body,
            }),
            transformResponse: (
                response: ApiResponse<{
                    urls: string[];
                    uploaded: number;
                    total: number;
                }>
            ) => {
                console.log(
                    '[RTK Query] uploadToImgbb response получен:',
                    response.data
                );
                return response.data;
            },
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
                const apiState = getApiState(getState, baseApi.reducerPath);
                if (!apiState) return;

                const queries = apiState.queries || {};
                const chatPatches: Array<{
                    undo: () => void;
                    chatId: number;
                }> = [];

                // Находим чаты с этим файлом
                const chatsWithFile = findChatsWithFile(queries, fileId);
                const chatId = chatsWithFile[0]?.chat.id || null;

                // Оптимистично удаляем файл из чатов
                for (const { args, chat } of chatsWithFile) {
                    const patchResult = dispatch(
                        mediaEndpoints.util.updateQueryData(
                            'getChat',
                            args,
                            (draft) => {
                                removeFileFromChat(draft, fileId);
                            }
                        )
                    );
                    chatPatches.push({
                        undo: patchResult.undo,
                        chatId: chat.id,
                    });
                }

                // Обновляем getRequest, если файл был в запросе
                const requestsWithFile = findRequestsWithFile(queries, fileId);
                for (const { requestId } of requestsWithFile) {
                    dispatch(
                        mediaEndpoints.util.updateQueryData(
                            'getRequest',
                            requestId,
                            (draft) => {
                                removeFileFromRequest(draft, fileId);
                            }
                        )
                    );
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
                                    const chat = draft.find(
                                        (c) => c.id === chatId
                                    );
                                    if (
                                        chat &&
                                        chat._count &&
                                        chat._count.files > 0
                                    ) {
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
    useLazyGetRequestQuery,
    useGetFilesQuery,
    useUploadThumbnailMutation,
    useDeleteFileMutation,
    useUploadToImgbbMutation,
} = mediaEndpoints;
