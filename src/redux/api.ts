import { createApi } from '@reduxjs/toolkit/query/react';
import { IRes } from 'server/interfaces';
import { baseQueryWithErrorHandling } from './api/base';
import { createAuthHeaders, handleSessionTimeout } from './api/utils';

export interface postReqData {
    path: string;
    body: any;
}

// dataAPI используется для legacy/универсальных запросов
// Для новых endpoints используйте baseApi из './api/base'
export const dataAPI = createApi({
    reducerPath: 'userAPI',
    baseQuery: (args, api, extraOptions) => 
        baseQueryWithErrorHandling(args, api, extraOptions, 'http://localhost:4000/'),
    refetchOnFocus: true,
    refetchOnReconnect: true,
    tagTypes: ['User'],

    endpoints: (build) => ({
        getData: build.query<IRes, string>({
            query: (path) => ({
                url: `${path}`,
                method: 'GET',
            }),
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
