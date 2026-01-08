// Реэкспорт всего API и хуков

// Базовый API
export { baseApi } from './base';

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
    PaginatedResponse,
    ApiResponse,
} from './base';

// Хуки для медиа (чаты, файлы, запросы)
export {
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
} from './media.endpoints';

// Хуки для моделей
export { useGetModelsQuery } from './models.endpoints';
