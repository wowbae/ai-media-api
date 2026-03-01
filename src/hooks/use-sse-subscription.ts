// Хук для SSE (Server-Sent Events) подписки на real-time обновления
import { useEffect, useRef } from 'react';
import { API_BASE_URL, baseApi } from '@/redux/api/base';
import { useDispatch } from 'react-redux';

/**
 * Хук для подключения к SSE обновлениям
 * 
 * Автоматически устанавливает соединение с сервером при монтировании
 * и закрывает при размонтировании
 * 
 * При получении событий о завершении задач автоматически инвалидирует
 * кеш RTK Query для обновления UI
 */
export function useSSESubscription() {
    const dispatch = useDispatch();
    const eventSourceRef = useRef<EventSource | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // SSE работает только на клиенте
        if (typeof window === 'undefined') {
            return;
        }

        // Функция для установки SSE подключения
        // EventSource не поддерживает кастомные заголовки, токен передаём в query
        const connectSSE = () => {
            const token = localStorage.getItem('token');
            if (!token) {
                reconnectTimeoutRef.current = setTimeout(connectSSE, 5000);
                return;
            }

            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }

            try {
                const url = `${API_BASE_URL}/sse?token=${encodeURIComponent(token)}`;
                const eventSource = new EventSource(url, {
                    withCredentials: true,
                });

                eventSourceRef.current = eventSource;

                // Обработка подключения
                eventSource.onopen = () => {
                    console.log('[SSE] ✅ Подключение установлено');
                };

                // Обработка ошибок
                eventSource.onerror = (error) => {
                    console.error('[SSE] ❌ Ошибка подключения:', error);
                    
                    // Пытаемся переподключиться через 5 секунд
                    if (reconnectTimeoutRef.current) {
                        clearTimeout(reconnectTimeoutRef.current);
                    }
                    reconnectTimeoutRef.current = setTimeout(() => {
                        connectSSE();
                    }, 5000);
                };

                // Обработка событий от сервера
                eventSource.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        console.log('[SSE] 📩 Получено событие:', data);

                        // Инвалидируем теги для обновления данных
                        if (data.type === 'REQUEST_COMPLETED' || data.type === 'REQUEST_FAILED') {
                            // Инвалидируем конкретный запрос
                            dispatch(baseApi.util.invalidateTags([
                                { type: 'Request', id: data.requestId },
                                { type: 'Request', id: 'LIST' },
                                { type: 'Chat', id: data.chatId },
                                { type: 'Chat', id: 'LIST' },
                            ]));
                        }
                    } catch (error) {
                        console.error('[SSE] Ошибка парсинга события:', error);
                    }
                };
            } catch (error) {
                console.error('[SSE] Ошибка создания EventSource:', error);
                
                // Пытаемся переподключиться через 5 секунд
                if (reconnectTimeoutRef.current) {
                    clearTimeout(reconnectTimeoutRef.current);
                }
                reconnectTimeoutRef.current = setTimeout(() => {
                    connectSSE();
                }, 5000);
            }
        };

        // Устанавливаем подключение
        connectSSE();

        // Очищаем при размонтировании
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
                console.log('[SSE] 🔌 Подключение закрыто');
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
        };
    }, [dispatch]);

    return {
        isConnected: typeof window !== 'undefined' && eventSourceRef.current?.readyState === EventSource.OPEN,
        readyState: eventSourceRef.current?.readyState,
    };
}
