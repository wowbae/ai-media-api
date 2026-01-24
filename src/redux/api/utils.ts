// Утилиты для RTK Query API
import { FetchBaseQueryArgs } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';

/**
 * Создает функцию prepareHeaders для добавления токена авторизации
 */
export function createAuthHeaders(
    headers: Headers,
    { getState }: { getState: () => unknown }
): Headers {
    const token = (getState() as RootState).auth.token;
    if (token) {
        headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
}
