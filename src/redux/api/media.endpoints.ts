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
    type PricingMap,
    type PromptEnhanceRequest,
    type PromptEnhanceResponse,
    type LoraFileInfo,
} from "./base";
import {
    getApiState,
    findChatsWithFile,
    findRequestsWithFile,
    updateFileInChat,
    removeFileFromChat,
    updateFileInRequest,
    removeFileFromRequest,
} from "./cache-utils";

export const mediaEndpoints = baseApi.injectEndpoints({
    endpoints: (build) => ({
        // ==================== Чаты ====================
        // Цены моделей
        getPricing: build.query<PricingMap, void>({
            query: () => "/pricing",
            transformResponse: (response: ApiResponse<PricingMap>) =>
                response.data,
            providesTags: [{ type: "Model", id: "PRICING" }],
        }),

        // Остаток кредитов Kie.ai (GET api.kie.ai/api/v1/chat/credit)
        getKieCredits: build.query<number | null, void>({
            query: () => "/kie-credits",
            transformResponse: (response: {
                success: boolean;
                credits: number | null;
            }) => (response.success ? response.credits : null),
            providesTags: [{ type: "Model", id: "KIE_CREDITS" }],
        }),

        // Получить все чаты
        getChats: build.query<
            MediaChat[],
            { appMode?: "default" | "ai-model" } | void
        >({
            query: (arg) => {
                const appMode =
                    arg && "appMode" in arg ? arg.appMode : undefined;
                return appMode ? `/chats?appMode=${appMode}` : "/chats";
            },
            transformResponse: (response: ApiResponse<MediaChat[]>) =>
                response.data,
            providesTags: (result) =>
                result
                    ? [
                          ...result.map(({ id }) => ({
                              type: "Chat" as const,
                              id,
                          })),
                          { type: "Chat", id: "LIST" },
                      ]
                    : [{ type: "Chat", id: "LIST" }],
        }),

        // Получить чат по ID
        getChat: build.query<
            MediaChatWithRequests,
            {
                id: number;
                limit?: number;
                includeInputFiles?: boolean;
                appMode?: "default" | "ai-model";
            }
        >({
            query: ({ id, limit, includeInputFiles, appMode }) => {
                const url = `/chats/${id}`;
                const params = new URLSearchParams();
                if (limit !== undefined)
                    params.append("limit", limit.toString());
                if (includeInputFiles)
                    params.append("includeInputFiles", "true");
                if (appMode) params.append("appMode", appMode);
                const queryString = params.toString();
                return url + (queryString ? `?${queryString}` : "");
            },
            transformResponse: (response: ApiResponse<MediaChatWithRequests>) =>
                response.data,
            providesTags: (result, _error, { id }) => [
                { type: "Chat", id },
                // Добавляем File теги, чтобы при удалении файла чат обновлялся
                ...(result?.requests.flatMap((req) =>
                    req.files.map((file) => ({
                        type: "File" as const,
                        id: file.id,
                    })),
                ) || []),
            ],
        }),

        // Создать чат
        createChat: build.mutation<
            MediaChat,
            CreateChatRequest & { appMode?: "default" | "ai-model" }
        >({
            query: (body) => ({
                url: "/chats",
                method: "POST",
                body,
            }),
            transformResponse: (response: ApiResponse<MediaChat>) =>
                response.data,
            invalidatesTags: [{ type: "Chat", id: "LIST" }],
        }),

        // Обновить чат
        updateChat: build.mutation<MediaChat, UpdateChatRequest>({
            query: ({ id, ...body }) => ({
                url: `/chats/${id}`,
                method: "PATCH",
                body,
            }),
            transformResponse: (response: ApiResponse<MediaChat>) =>
                response.data,
            invalidatesTags: (_result, _error, { id }) => [
                { type: "Chat", id },
                { type: "Chat", id: "LIST" },
            ],
        }),

        // Удалить чат
        deleteChat: build.mutation<void, number>({
            query: (id) => ({
                url: `/chats/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: (_result, _error, chatId) => [
                { type: "Chat", id: chatId },
                { type: "Chat", id: "LIST" },
            ],
        }),

        // ==================== Генерация ====================

        // Отправить запрос на генерацию
        generateMedia: build.mutation<
            GenerateMediaResponse,
            GenerateMediaRequest
        >({
            query: (body) => {
                console.log("[RTK Query] generateMedia mutation вызван:", {
                    chatId: body.chatId,
                    prompt: body.prompt?.substring(0, 50),
                    model: body.model,
                    format: body.format,
                    quality: body.quality,
                    timestamp: new Date().toISOString(),
                });
                return {
                    url: "/generate",
                    method: "POST",
                    body,
                };
            },
            transformResponse: (
                response: ApiResponse<GenerateMediaResponse>,
            ) => {
                console.log(
                    "[RTK Query] generateMedia response получен:",
                    response.data,
                );
                return response.data;
            },
            // Инвалидируем кеш чата при успехе, чтобы немедленно обновить UI
            invalidatesTags: (result, _error, { chatId }) => [
                { type: "Chat", id: chatId }, // Обновляем конкретный чат
                { type: "Chat", id: "LIST" }, // Обновляем список всех чатов (счетчики)
                { type: "Request", id: result?.requestId || "LIST" }, // Обновляем конкретный запрос
                { type: "Request", id: "LIST" }, // Обновляем список всех запросов
            ],
        }),

        // Тестовый режим генерации (использует последний файл из чата)
        generateMediaTest: build.mutation<
            GenerateMediaResponse,
            { chatId: number; prompt: string; seed?: string | number }
        >({
            query: (body) => {
                console.log(
                    "[RTK Query] 🧪 generateMediaTest mutation вызван (тестовый режим):",
                    {
                        chatId: body.chatId,
                        prompt: body.prompt?.substring(0, 50),
                        seed: body.seed,
                        timestamp: new Date().toISOString(),
                    },
                );
                return {
                    url: "/generate-test",
                    method: "POST",
                    body: {
                        chatId: body.chatId,
                        prompt: body.prompt,
                        ...(body.seed !== undefined &&
                            body.seed !== null &&
                            body.seed !== "" && { seed: body.seed }),
                    },
                };
            },
            transformResponse: (
                response: ApiResponse<GenerateMediaResponse>,
            ) => {
                console.log(
                    "[RTK Query] 🧪 generateMediaTest response получен (тестовый режим):",
                    response.data,
                );
                return response.data;
            },
            // Инвалидируем кеш чата при успехе, чтобы обновить список запросов
            invalidatesTags: (result, _error, { chatId }) => [
                { type: "Chat", id: chatId },
                { type: "Request", id: result?.requestId || "LIST" },
            ],
        }),

        // ==================== Запросы ====================

        // Получить статус запроса
        getRequest: build.query<
            MediaRequest,
            { id: number; appMode?: "default" | "ai-model" }
        >({
            query: ({ id, appMode }) =>
                appMode
                    ? `/requests/${id}?appMode=${appMode}`
                    : `/requests/${id}`,
            transformResponse: (response: ApiResponse<MediaRequest>) => {
                console.log("[RTK Query] getRequest response:", {
                    id: response.data.id,
                    status: response.data.status,
                    filesCount: response.data.files.length,
                    timestamp: new Date().toISOString(),
                });
                return response.data;
            },
            providesTags: (result, _error, args) => [
                { type: "Request", id: args.id },
                ...(result?.files.map((f) => ({
                    type: "File" as const,
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
            {
                page?: number;
                limit?: number;
                chatId?: number;
                appMode?: "default" | "ai-model";
            }
        >({
            query: ({ page = 1, limit = 20, chatId, appMode }) => {
                const params = new URLSearchParams();
                params.append("page", page.toString());
                params.append("limit", limit.toString());
                if (chatId !== undefined) {
                    params.append("chatId", chatId.toString());
                }
                if (appMode) params.append("appMode", appMode);
                return `/files?${params.toString()}`;
            },
            transformResponse: (
                response: ApiResponse<MediaFile[]> & {
                    pagination: PaginatedResponse<unknown>["pagination"];
                },
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
                              type: "File" as const,
                              id,
                          })),
                          { type: "File", id: "LIST" },
                          // Добавляем тег чата для инвалидации при изменении чата
                          ...(chatId !== undefined
                              ? [{ type: "Chat" as const, id: chatId }]
                              : []),
                      ]
                    : [
                          { type: "File", id: "LIST" },
                          ...(chatId !== undefined
                              ? [{ type: "Chat" as const, id: chatId }]
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
                method: "POST",
                body: { thumbnail },
            }),
            transformResponse: (
                response: ApiResponse<{ previewPath: string }>,
            ) => response.data,
            // Оптимистичное обновление - сразу показываем превью
            async onQueryStarted(
                { fileId, thumbnail },
                { dispatch, queryFulfilled, getState },
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
                            "getChat",
                            args,
                            (draft) => {
                                updateFileInChat(draft, fileId, (file) => ({
                                    ...file,
                                    previewPath: `__pending__${thumbnail}`,
                                }));
                            },
                        ),
                    );
                    chatPatches.push({ undo: patchResult.undo });
                }

                try {
                    const { data } = await queryFulfilled;
                    // При успехе - обновляем на реальный путь
                    for (const { args } of chatsWithFile) {
                        dispatch(
                            mediaEndpoints.util.updateQueryData(
                                "getChat",
                                args,
                                (draft) => {
                                    updateFileInChat(draft, fileId, (file) => ({
                                        ...file,
                                        previewPath: data.previewPath,
                                    }));
                                },
                            ),
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
                url: "/upload-to-imgbb",
                method: "POST",
                body,
            }),
            transformResponse: (
                response: ApiResponse<{
                    urls: string[];
                    uploaded: number;
                    total: number;
                }>,
            ) => {
                console.log(
                    "[RTK Query] uploadToImgbb response получен:",
                    response.data,
                );
                return response.data;
            },
        }),

        // Загрузить пользовательские медиа
        uploadUserMedia: build.mutation<
            { requestId: number; files: MediaFile[] },
            {
                chatId: number;
                appMode?: "default" | "ai-model";
                files: {
                    base64: string;
                    mimeType: string;
                    filename: string;
                    imgbbUrl?: string;
                }[];
            }
        >({
            query: (body) => ({
                url: "/upload-user-media",
                method: "POST",
                body,
            }),
            transformResponse: (
                response: ApiResponse<{
                    requestId: number;
                    files: MediaFile[];
                }>,
            ) => response.data,
            invalidatesTags: (result, _error, { chatId }) => [
                { type: "Chat", id: chatId },
                { type: "Chat", id: "LIST" },
                { type: "Request", id: result?.requestId || "LIST" },
                { type: "Request", id: "LIST" },
                { type: "File", id: "LIST" },
            ],
        }),
        promptEnhance: build.mutation<
            PromptEnhanceResponse,
            PromptEnhanceRequest
        >({
            query: (body) => ({
                url: "/prompt-enhance",
                method: "POST",
                body,
            }),
            transformResponse: (response: ApiResponse<PromptEnhanceResponse>) =>
                response.data,
        }),

        // Библиотека LoRA файлов на сервере
        getLoraFiles: build.query<LoraFileInfo[], void>({
            query: () => "/loras",
            transformResponse: (response: ApiResponse<LoraFileInfo[]>) =>
                response.data,
            providesTags: [{ type: "File", id: "LORA_LIBRARY" }],
        }),

        // Загрузить LoRA файл (.safetensors) в библиотеку сервера
        uploadLoraFile: build.mutation<
            LoraFileInfo,
            { fileBase64: string; filename: string }
        >({
            query: (body) => ({
                url: "/loras/upload",
                method: "POST",
                body,
            }),
            transformResponse: (response: ApiResponse<LoraFileInfo>) =>
                response.data,
            invalidatesTags: [{ type: "File", id: "LORA_LIBRARY" }],
        }),

        deleteLoraFile: build.mutation<{ filename: string }, string>({
            query: (filename) => ({
                url: `/loras/${encodeURIComponent(filename)}`,
                method: "DELETE",
            }),
            transformResponse: (response: ApiResponse<{ filename: string }>) =>
                response.data,
            invalidatesTags: [{ type: "File", id: "LORA_LIBRARY" }],
        }),

        // Удалить файл
        deleteFile: build.mutation<void, number>({
            query: (id) => ({
                url: `/files/${id}`,
                method: "DELETE",
            }),
            async onQueryStarted(
                fileId,
                { dispatch, queryFulfilled, getState },
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
                            "getChat",
                            args,
                            (draft) => {
                                removeFileFromChat(draft, fileId);
                            },
                        ),
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
                            "getRequest",
                            { id: requestId },
                            (draft) => {
                                removeFileFromRequest(draft, fileId);
                            },
                        ),
                    );
                }

                // Оптимистично обновляем список чатов (для счетчиков файлов)
                let chatsPatch: { undo: () => void } | null = null;
                if (chatId) {
                    chatsPatch = dispatch(
                        mediaEndpoints.util.updateQueryData(
                            "getChats",
                            undefined,
                            (draft) => {
                                if (draft) {
                                    const chat = draft.find(
                                        (c) => c.id === chatId,
                                    );
                                    if (
                                        chat &&
                                        chat._count &&
                                        chat._count.files > 0
                                    ) {
                                        chat._count.files -= 1;
                                    }
                                }
                            },
                        ),
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
                { type: "File", id: fileId },
                { type: "File", id: "LIST" },
                { type: "Request", id: "LIST" },
            ],
        }),
    }),
    overrideExisting: false,
});

// Экспортируем хуки
export const {
    useGetChatsQuery,
    useGetChatQuery,
    useGetPricingQuery,
    useGetKieCreditsQuery,
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
    useUploadUserMediaMutation,
    useGetLoraFilesQuery,
    useUploadLoraFileMutation,
    useDeleteLoraFileMutation,
    usePromptEnhanceMutation,
} = mediaEndpoints;
