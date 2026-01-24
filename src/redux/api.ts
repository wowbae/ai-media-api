import { createApi, fetchBaseQuery, retry } from '@reduxjs/toolkit/query/react';
import { IRes } from 'server/interfaces';
import { createAuthHeaders } from './api/utils';

export interface postReqData {
    path: string;
    body: any;
}

// Обертка для baseQuery с обработкой ошибок
const baseQueryWithErrorHandling = async (args: any, api: any, extraOptions: any) => {
    const result = await fetchBaseQuery({
        baseUrl: 'http://localhost:4000/',
        prepareHeaders: createAuthHeaders,
    })(args, api, extraOptions);

    // Обработка ошибок 401 (Unauthorized)
    if (result.error && 'status' in result.error && result.error.status === 401) {
        // Показываем alert только если это не запрос /auth/me (чтобы не спамить при отсутствии токена)
        const url = typeof args === 'string' ? args : args?.url || '';
        if (!url.includes('/auth/me')) {
            alert('Ошибка авторизации: сессия истекла. Пожалуйста, войдите заново.');
        }
    }

    return result;
};

export const dataAPI = createApi({
    reducerPath: 'userAPI',
    baseQuery: baseQueryWithErrorHandling,
    refetchOnFocus: true,
    refetchOnReconnect: true,
    tagTypes: ['User'],

    endpoints: (build) => ({
        getData: build.query<IRes, string>({
            query: (path) => {
                return {
                    url: `${path}`,
                    method: 'GET',
                };
            },
            async onQueryStarted(_, { dispatch, queryFulfilled }) {
                // что-то можно сделать при получении данных
            },
            providesTags: ['User'],
        }),
        postData: build.mutation<IRes, postReqData>({
            query: (data) => ({
                url: `${data.path}`,
                method: 'POST',
                body: data.body,
            }),
            invalidatesTags: ['User'],
        }),
    }),
});

export const { useGetDataQuery, usePostDataMutation } = dataAPI;
