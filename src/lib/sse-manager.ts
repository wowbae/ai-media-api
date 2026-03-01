/**
 * Глобальный SSE менеджер — живёт вне React, не разрывается при HMR
 *
 * В dev частые reconnect вызваны Vite HMR (перезагрузка при сохранении файлов)
 * и bun --watch (рестарт сервера). Singleton минимизирует лишние переподключения.
 */
import type { Store } from '@reduxjs/toolkit';
import { API_BASE_URL, baseApi } from '@/redux/api/base';

let eventSource: EventSource | null = null;
let reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
let isInitialized = false;

const RECONNECT_DELAY_MS = 5000;

function connect(store: Store): void {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
        reconnectTimeoutId = setTimeout(() => connect(store), RECONNECT_DELAY_MS);
        return;
    }

    if (eventSource?.readyState === EventSource.OPEN) return;

    if (eventSource) {
        eventSource.close();
        eventSource = null;
    }

    try {
        const url = `${API_BASE_URL}/sse?token=${encodeURIComponent(token)}`;
        const es = new EventSource(url, { withCredentials: true });
        eventSource = es;

        es.onopen = () => {
            if (import.meta.env.DEV) {
                console.log('[SSE] ✅ Подключение установлено');
            }
        };

        es.onerror = () => {
            if (reconnectTimeoutId) clearTimeout(reconnectTimeoutId);
            eventSource = null;
            reconnectTimeoutId = setTimeout(() => connect(store), RECONNECT_DELAY_MS);
        };

        es.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'REQUEST_COMPLETED' || data.type === 'REQUEST_FAILED') {
                    store.dispatch(
                        baseApi.util.invalidateTags([
                            { type: 'Request', id: data.requestId },
                            { type: 'Request', id: 'LIST' },
                            { type: 'Chat', id: data.chatId },
                            { type: 'Chat', id: 'LIST' },
                        ])
                    );
                }
            } catch {
                // Игнорируем ошибки парсинга
            }
        };
    } catch {
        reconnectTimeoutId = setTimeout(() => connect(store), RECONNECT_DELAY_MS);
    }
}

function disconnect(): void {
    if (reconnectTimeoutId) {
        clearTimeout(reconnectTimeoutId);
        reconnectTimeoutId = null;
    }
    if (eventSource) {
        eventSource.close();
        eventSource = null;
    }
    isInitialized = false;
}

/**
 * Инициализировать SSE — вызывать один раз при загрузке приложения.
 * Идемпотентно: повторный вызов не создаёт дублирующих подключений.
 */
export function initSSE(store: Store): void {
    if (typeof window === 'undefined') return;
    if (isInitialized) return;
    isInitialized = true;
    connect(store);
}

/**
 * Отключить SSE (например, при logout).
 */
export function closeSSE(): void {
    disconnect();
}

/**
 * Принудительное переподключение (при логине, когда токен появился).
 */
export function reconnectSSE(store: Store): void {
    disconnect();
    isInitialized = true;
    connect(store);
}
