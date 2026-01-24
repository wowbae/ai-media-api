// Хук для управления polling статуса запроса генерации
import { useState, useEffect, useRef, useCallback } from 'react';
import { useGetRequestQuery, useGetModelsQuery } from '@/redux/media-api';
import type { MediaRequest } from '@/redux/media-api';
import { getPollingInitialDelay } from '@/lib/constants';

interface PendingMessage {
    id: string;
    requestId?: number;
    status: 'PENDING' | 'PROCESSING' | 'FAILED';
    errorMessage?: string;
}

interface UseRequestPollingParams {
    isTestMode: boolean;
    onChatRefetch: () => Promise<void>;
    onPendingMessageUpdate?: (
        updater: (prev: PendingMessage | null) => PendingMessage | null
    ) => void;
}

interface UseRequestPollingReturn {
    pollingRequestId: number | null;
    pollingRequest: MediaRequest | undefined;
    setPollingRequestId: (id: number | null) => void;
    pollingState: {
        previousStatus: string | null;
        previousFilesCount: number | null;
        shouldUpdate: boolean;
    };
}

const MAX_POLLING_TIME = 7 * 60 * 1000; // 7 минут

export function useRequestPolling({
    isTestMode,
    onChatRefetch,
    onPendingMessageUpdate,
}: UseRequestPollingParams): UseRequestPollingReturn {
    const [pollingRequestId, setPollingRequestId] = useState<number | null>(null);
    // Внутреннее состояние для реального polling (после задержки)
    const [actualPollingRequestId, setActualPollingRequestId] = useState<number | null>(null);
    const pollingDelayTimerRef = useRef<NodeJS.Timeout | null>(null);
    
    // Получаем список моделей для определения задержки
    const { data: models } = useGetModelsQuery();
    
    // Состояние для отслеживания предыдущих значений
    const [previousStatus, setPreviousStatus] = useState<string | null>(null);
    const [previousFilesCount, setPreviousFilesCount] = useState<number | null>(null);
    const pollingStartTimeRef = useRef<number | null>(null);
    const [shouldUpdate, setShouldUpdate] = useState(false);

    // Обёртка для setPollingRequestId с задержкой
    const setPollingRequestIdWithDelay = useCallback((requestId: number | null) => {
        // Очищаем предыдущий таймер
        if (pollingDelayTimerRef.current) {
            clearTimeout(pollingDelayTimerRef.current);
            pollingDelayTimerRef.current = null;
        }

        // Обновляем внешнее состояние сразу (для совместимости с интерфейсом)
        setPollingRequestId(requestId);

        if (requestId === null) {
            // Немедленно останавливаем polling
            setActualPollingRequestId(null);
            return;
        }

        // Определяем задержку на основе модели (если модель неизвестна, используем задержку по умолчанию)
        const delay = getPollingInitialDelay(null, models);

        // Устанавливаем задержку перед началом polling
        console.log(
            `[Chat] ⏳ Ожидание ${delay / 1000} секунд перед началом polling: requestId=${requestId}`
        );
        pollingDelayTimerRef.current = setTimeout(() => {
            setActualPollingRequestId(requestId);
            pollingDelayTimerRef.current = null;
        }, delay);
    }, [models]);

    // Polling запрос (используем actualPollingRequestId после задержки)
    const shouldSkipPolling = !actualPollingRequestId || isTestMode;
    const { data: pollingRequest } = useGetRequestQuery(actualPollingRequestId!, {
        skip: shouldSkipPolling,
        pollingInterval: isTestMode ? 0 : 7000,
        refetchOnMountOrArgChange: true,
    });

    // Запоминаем время начала polling (когда actualPollingRequestId установлен)
    useEffect(() => {
        if (actualPollingRequestId && !pollingStartTimeRef.current) {
            pollingStartTimeRef.current = Date.now();
        } else if (!actualPollingRequestId && pollingStartTimeRef.current) {
            // Сбрасываем время начала при остановке polling
            pollingStartTimeRef.current = null;
        }
    }, [actualPollingRequestId]);

    // Останавливаем polling при включении тестового режима
    useEffect(() => {
        if (isTestMode && pollingRequestId !== null) {
            console.log('[Chat] 🧪 Тестовый режим включен: останавливаем polling');
            setPollingRequestIdWithDelay(null);
        }
    }, [isTestMode, pollingRequestId, setPollingRequestIdWithDelay]);

    // Очистка таймера при размонтировании
    useEffect(() => {
        return () => {
            if (pollingDelayTimerRef.current) {
                clearTimeout(pollingDelayTimerRef.current);
                pollingDelayTimerRef.current = null;
            }
        };
    }, []);

    // Обработка изменений polling request
    useEffect(() => {
        if (!pollingRequest || !actualPollingRequestId) return;

        // Проверяем, что pollingRequest соответствует текущему actualPollingRequestId
        if (pollingRequest.id !== actualPollingRequestId) {
            console.log(
                '[Chat] ⚠️ pollingRequest.id не совпадает с actualPollingRequestId, игнорируем:',
                {
                    pollingRequestId: pollingRequest.id,
                    expectedId: actualPollingRequestId,
                }
            );
            return;
        }

        const currentStatus = pollingRequest.status;
        const currentFilesCount = pollingRequest.files?.length || 0;

        // Проверяем таймаут polling
        if (pollingStartTimeRef.current) {
            const pollingDuration = Date.now() - pollingStartTimeRef.current;
            if (pollingDuration > MAX_POLLING_TIME) {
                console.warn('[Chat] ⚠️ Polling превысил максимальное время, останавливаем');
                setPollingRequestIdWithDelay(null);
                pollingStartTimeRef.current = null;
                setPreviousStatus(null);
                setPreviousFilesCount(null);
                onChatRefetch().catch((error) => {
                    console.error('[Chat] Ошибка при обновлении чата:', error);
                });
                return;
            }
        }

        // Определяем, нужно ли обновлять чат
        const statusChanged = previousStatus !== currentStatus;
        const filesCountChanged =
            previousFilesCount !== null && previousFilesCount !== currentFilesCount;
        const isFirstRequest = previousStatus === null;

        console.log('[Chat] Polling request статус:', {
            id: pollingRequest.id,
            status: currentStatus,
            previousStatus,
            statusChanged,
            filesCount: currentFilesCount,
            previousFilesCount,
            filesCountChanged,
            isFirstRequest,
            errorMessage: pollingRequest.errorMessage || null,
        });

        // Обновляем pending-сообщение
        if (onPendingMessageUpdate) {
            onPendingMessageUpdate((prev) => {
                if (!prev) return prev;
                if (prev.requestId !== actualPollingRequestId) {
                    return prev;
                }

                const isProcessing = currentStatus === 'PROCESSING';
                const isFailed = currentStatus === 'FAILED';
                const nextStatus = isProcessing
                    ? 'PROCESSING'
                    : isFailed
                      ? 'FAILED'
                      : prev.status;
                const nextError =
                    isFailed && (pollingRequest.errorMessage || true)
                        ? pollingRequest.errorMessage ||
                          'Генерация не удалась. Детали ошибки не предоставлены провайдером.'
                        : prev.errorMessage;

                if (nextStatus === prev.status && nextError === prev.errorMessage) {
                    return prev;
                }

                return {
                    ...prev,
                    status: nextStatus,
                    errorMessage: nextError,
                };
            });
        }

        // Определяем, нужно ли обновлять чат
        const needsUpdate =
            isFirstRequest ||
            statusChanged ||
            filesCountChanged ||
            (currentStatus === 'PROCESSING' &&
                previousStatus === 'PROCESSING' &&
                Date.now() % 7000 < 1500);

        setShouldUpdate(needsUpdate);

        if (needsUpdate) {
            console.log('[Chat] Обновляем чат');
            onChatRefetch().catch((error) => {
                console.error('[Chat] Ошибка при обновлении чата:', error);
            });
        }

        // Останавливаем polling при завершении или ошибке
        if (currentStatus === 'COMPLETED' || currentStatus === 'FAILED') {
            console.log('[Chat] Запрос завершен, останавливаем polling');
            setPollingRequestIdWithDelay(null);
            pollingStartTimeRef.current = null;
            setPreviousStatus(null);
            setPreviousFilesCount(null);

            // Финальное обновление чата
            setTimeout(() => {
                onChatRefetch().catch((error) => {
                    console.error('[Chat] Ошибка при финальном обновлении чата:', error);
                });
            }, 500);

            setTimeout(() => {
                onChatRefetch().catch((error) => {
                    console.error('[Chat] Ошибка при дополнительном обновлении чата:', error);
                });
            }, 1500);
        } else {
            // Сохраняем текущие значения для следующей проверки
            setPreviousStatus(currentStatus);
            setPreviousFilesCount(currentFilesCount);
        }
    }, [pollingRequest, actualPollingRequestId, previousStatus, previousFilesCount, onChatRefetch, onPendingMessageUpdate]);

    return {
        pollingRequestId,
        pollingRequest,
        setPollingRequestId: setPollingRequestIdWithDelay,
        pollingState: {
            previousStatus,
            previousFilesCount,
            shouldUpdate,
        },
    };
}
