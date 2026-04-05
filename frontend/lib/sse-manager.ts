/**
 * Глобальный SSE менеджер — живёт вне React, не разрывается при HMR
 *
 * При HMR (Vite) явно закрываем соединение перед заменой модуля — иначе накапливаются
 * "призрачные" соединения, при refresh дающие лавину "Отключен".
 *
 * При вкладке в фоне браузер закрывает соединения — не переподключаемся агрессивно.
 */
import type { Store } from '@reduxjs/toolkit';
import { API_BASE_URL, baseApi } from '@/redux/api/base';

let eventSource: EventSource | null = null;

// При HMR закрываем соединение до замены модуля — иначе дублируются подключения
if (typeof import.meta !== 'undefined' && import.meta.hot) {
    import.meta.hot.dispose(() => {
        if (eventSource) {
            eventSource.close();
            eventSource = null;
        }
        if (reconnectTimeoutId) {
            clearTimeout(reconnectTimeoutId);
            reconnectTimeoutId = null;
        }
        isInitialized = false;
    });
}
let reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
let isInitialized = false;
let reconnectAttempts = 0;

const RECONNECT_DELAY_MS = 5000;
const MAX_RECONNECT_DELAY_MS = 60000;

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
            reconnectAttempts = 0;
            if (import.meta.env.DEV) {
                console.log('[SSE] ✅ Подключение установлено');
            }
        };

        es.onerror = () => {
            if (reconnectTimeoutId) clearTimeout(reconnectTimeoutId);
            // Явно закрываем — иначе браузер сам переподключается, получается гонка
            if (eventSource) {
                eventSource.close();
                eventSource = null;
            }
            const isHidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
            const delay = isHidden
                ? Math.min(
                      RECONNECT_DELAY_MS * Math.pow(2, reconnectAttempts),
                      MAX_RECONNECT_DELAY_MS,
                  )
                : RECONNECT_DELAY_MS;
            reconnectAttempts += 1;
            reconnectTimeoutId = setTimeout(() => connect(store), delay);
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
    reconnectAttempts = 0;
}

// При возврате на вкладку — переподключаемся сразу (если соединение было разорвано)
function setupVisibilityListener(store: Store): void {
    if (typeof document === 'undefined') return;
    document.addEventListener('visibilitychange', () => {
        const isDisconnected = !eventSource || eventSource.readyState === EventSource.CLOSED;
        if (document.visibilityState === 'visible' && isDisconnected) {
            if (reconnectTimeoutId) {
                clearTimeout(reconnectTimeoutId);
                reconnectTimeoutId = null;
            }
            reconnectAttempts = 0;
            connect(store);
        }
    });
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
    setupVisibilityListener(store);
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
