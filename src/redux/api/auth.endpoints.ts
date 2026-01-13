import { baseApi } from './base';
import { User } from '../auth-slice';

// Интерфейс для ответа API (Prisma User)
interface PrismaUserResponse {
    id: number;
    email: string;
    role: 'USER' | 'ADMIN';
    tokenBalance: number;
    telegramId?: string | null;
    createdAt: string;
    updatedAt: string;
}

// Трансформация Prisma User в Redux User
function transformPrismaUserToReduxUser(prismaUser: PrismaUserResponse): User {
    return {
        id: prismaUser.id,
        email: prismaUser.email,
        role: prismaUser.role,
        balance: prismaUser.tokenBalance,
        telegramId: prismaUser.telegramId ?? undefined,
    };
}

export interface AuthResponse {
    token: string;
    user: User;
}

export const authEndpoints = baseApi.injectEndpoints({
    endpoints: (build) => ({
        login: build.mutation<AuthResponse, { email: string; password: string }>({
            query: (credentials) => ({
                url: '../auth/login',
                method: 'POST',
                body: credentials,
            }),
            transformResponse: (response: { user: PrismaUserResponse; token: string }): AuthResponse => ({
                token: response.token,
                user: transformPrismaUserToReduxUser(response.user),
            }),
        }),
        register: build.mutation<AuthResponse, { email: string; password: string }>({
            query: (credentials) => ({
                url: '../auth/register',
                method: 'POST',
                body: credentials,
            }),
            transformResponse: (response: { user: PrismaUserResponse; token: string }): AuthResponse => ({
                token: response.token,
                user: transformPrismaUserToReduxUser(response.user),
            }),
        }),
        getMe: build.query<User, void>({
            query: () => '../auth/me',
            transformResponse: (response: { user: PrismaUserResponse }): User =>
                transformPrismaUserToReduxUser(response.user),
        }),
    }),
});

export const { useLoginMutation, useRegisterMutation, useGetMeQuery } = authEndpoints;
