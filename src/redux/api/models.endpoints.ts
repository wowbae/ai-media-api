// Эндпоинты для работы с моделями
import { baseApi, type ApiResponse, type ModelInfo } from './base';

export const modelsEndpoints = baseApi.injectEndpoints({
    endpoints: (build) => ({
        // Получить доступные модели
        getModels: build.query<ModelInfo[], void>({
            query: () => '/models',
            transformResponse: (response: ApiResponse<ModelInfo[]>) =>
                response.data,
            providesTags: [{ type: 'Model', id: 'LIST' }],
            // Модели обновляются редко, поэтому не нужно часто проверять обновления
            keepUnusedDataFor: 300, // Хранить данные 5 минут
        }),
    }),
    overrideExisting: false,
});

// Экспортируем хуки
export const { useGetModelsQuery } = modelsEndpoints;
