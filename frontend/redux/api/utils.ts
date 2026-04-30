// Утилиты для RTK Query API
import { FetchBaseQueryArgs } from "@reduxjs/toolkit/query/react";
import type { RootState } from "../store";
import { config } from "@/lib/config";

/**
 * Создает функцию prepareHeaders для добавления токена авторизации
 */
export function createAuthHeaders(
    headers: Headers,
    { getState }: { getState: () => unknown },
): Headers {
    const token = (getState() as RootState).auth.token;
    if (token) {
        headers.set("authorization", `Bearer ${token}`);
    }
    return headers;
}

/**
 * Обрабатывает таймаут/истечение сессии: очищает токен и перенаправляет на страницу логина
 */
export function handleSessionTimeout(): void {
    if (config.disableAuth) {
        return;
    }

    // Очищаем токен из localStorage
    localStorage.removeItem("token");

    // Перенаправляем на страницу логина
    if (typeof window !== "undefined") {
        window.location.href = "/login";
    }
}
