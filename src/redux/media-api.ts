// RTK Query API для медиа-генерации
// Реэкспорт из новой структуры для обратной совместимости

// Реэкспорт API
export { baseApi as mediaApi } from './api/base';

// Реэкспорт всех типов
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
} from './api/index';

// Реэкспорт всех хуков
export {
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
    useUploadUserMediaMutation,
    useGetModelsQuery,
} from './api/index';
