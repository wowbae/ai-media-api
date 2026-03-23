// Реэкспорт всего API и хуков

// Базовый API
export { baseApi } from "./base";

// Типы
export type {
    MediaModel,
    MediaType,
    RequestStatus,
    MediaProviderType,
    MediaChat,
    MediaRequest,
    MediaFile,
    MediaChatWithRequests,
    ModelInfo,
    CreateChatRequest,
    UpdateChatRequest,
    GenerateMediaRequest,
    GenerateMediaResponse,
    PromptEnhanceRequest,
    PromptEnhanceResponse,
    PaginatedResponse,
    ApiResponse,
    PricingMap,
    LoraFileInfo,
} from "./base";

// Хуки для медиа (чаты, файлы, запросы)
export {
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
} from "./media.endpoints";

// Хуки для моделей
export { useGetModelsQuery } from "./models.endpoints";
