// Хук для управления polling статуса запроса генерации
import { useState, useEffect, useRef, useCallback } from 'react';
import { useGetRequestQuery } from '@/redux/media-api';
import type { MediaRequest } from '@/redux/media-api';

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
    
    // Состояние для отслеживания предыдущих значений
    const [previousStatus, setPreviousStatus] = useState<string | null>(null);
    const [previousFilesCount, setPreviousFilesCount] = useState<number | null>(null);
    const pollingStartTimeRef = useRef<number | null>(null);
    const [shouldUpdate, setShouldUpdate] = useState(false);

    // Polling запрос
    const shouldSkipPolling = !pollingRequestId || isTestMode;
    const { data: pollingRequest } = useGetRequestQuery(pollingRequestId!, {
        skip: shouldSkipPolling,
        pollingInterval: isTestMode ? 0 : 7000,
        refetchOnMountOrArgChange: true,
    });

    // Запоминаем время начала polling
    useEffect(() => {
        if (pollingRequestId && !pollingStartTimeRef.current) {
            pollingStartTimeRef.current = Date.now();
        }
    }, [pollingRequestId]);

    // Останавливаем polling при включении тестового режима
    useEffect(() => {
        if (isTestMode && pollingRequestId !== null) {
            console.log('[Chat] 🧪 Тестовый режим включен: останавливаем polling');
            setPollingRequestId(null);
        }
    }, [isTestMode, pollingRequestId]);

    // Обработка изменений polling request
    useEffect(() => {
        if (!pollingRequest || !pollingRequestId) return;

        // Проверяем, что pollingRequest соответствует текущему pollingRequestId
        if (pollingRequest.id !== pollingRequestId) {
            console.log(
                '[Chat] ⚠️ pollingRequest.id не совпадает с pollingRequestId, игнорируем:',
                {
                    pollingRequestId: pollingRequest.id,
                    expectedId: pollingRequestId,
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
                setPollingRequestId(null);
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
                if (prev.requestId !== pollingRequestId) {
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
            setPollingRequestId(null);
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
    }, [pollingRequest, pollingRequestId, previousStatus, previousFilesCount, onChatRefetch, onPendingMessageUpdate]);

    return {
        pollingRequestId,
        pollingRequest,
        setPollingRequestId,
        pollingState: {
            previousStatus,
            previousFilesCount,
            shouldUpdate,
        },
    };
}
