import { createApi, fetchBaseQuery, retry } from '@reduxjs/toolkit/query/react';
import { IRes } from 'server/interfaces';
import { createAuthHeaders } from './api/utils';

export interface postReqData {
    path: string;
    body: any;
}

export const dataAPI = createApi({
    reducerPath: 'userAPI',
    baseQuery: fetchBaseQuery({
        baseUrl: 'http://localhost:4000/',
        prepareHeaders: createAuthHeaders,
    }),
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
