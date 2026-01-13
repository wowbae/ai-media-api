import { baseApi } from './base';
import { User } from '../auth-slice';

export interface AuthResponse {
    token: string;
    user: User;
}

export const authEndpoints = baseApi.injectEndpoints({
    endpoints: (build) => ({
        login: build.mutation<AuthResponse, any>({
            query: (credentials) => ({
                url: '../auth/login',
                method: 'POST',
                body: credentials,
            }),
        }),
        register: build.mutation<AuthResponse, any>({
            query: (credentials) => ({
                url: '../auth/register',
                method: 'POST',
                body: credentials,
            }),
        }),
        getMe: build.query<any, void>({
            query: () => '../auth/me',
        }),
    }),
});

export const { useLoginMutation, useRegisterMutation, useGetMeQuery } = authEndpoints;
