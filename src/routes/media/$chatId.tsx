// Страница чата с медиа-генерацией
import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import {
    ChatSidebar,
    ChatInput,
    MessageList,
    MediaGallery,
    type ChatInputRef,
    type ChatInputProps,
} from '@/components/media';
import {
    useGetChatQuery,
    useUpdateChatMutation,
    useGetRequestQuery,
    useGetModelsQuery,
    type MediaModel,
    type MediaRequest,
} from '@/redux/media-api';
import { PANEL_HEADER_CLASSES } from '@/lib/panel-styles';
import { cn } from '@/lib/utils';
import { getModelIcon } from '@/lib/model-utils';
import { useTestMode } from '@/hooks/use-test-mode';

export const Route = createFileRoute('/media/$chatId')({
    component: MediaChatPage,
});

// Интерфейс для pending-сообщения (оптимистичное отображение)
interface PendingMessage {
    id: string; // Временный ID (pending-xxx)
    requestId?: number; // Реальный ID запроса после получения от сервера
    prompt: string;
    model: MediaModel;
    createdAt: string;
    status: 'PENDING' | 'PROCESSING' | 'FAILED';
    errorMessage?: string;
}

function MediaChatPage() {
    const { chatId } = Route.useParams();
    const chatIdNum = parseInt(chatId);

    // Первоначальная загрузка только последних 3 сообщений для быстрого показа интерфейса
    const {
        data: chat,
        isLoading: isChatLoading,
        isFetching: isChatFetching,
        error: chatError,
        refetch,
    } = useGetChatQuery(
        { id: chatIdNum, limit: 3 },
        {
            // Показывать кешированные данные немедленно
            refetchOnMountOrArgChange: true, // Всегда обновлять при монтировании или изменении аргументов
            // Показывать данные из кеша даже при ошибке сети
            skip: false,
        }
    );

    // Фоновая подгрузка всех requests после первоначальной загрузки
    const shouldSkipFullLoad =
        isChatLoading ||
        !chat ||
        (chat._count && chat.requests.length >= chat._count.requests); // Пропускаем если уже загружены все requests

    const {
        data: fullChat,
        isLoading: isFullChatLoading,
        refetch: refetchFull,
    } = useGetChatQuery(
        { id: chatIdNum },
        {
            skip: shouldSkipFullLoad,
            refetchOnMountOrArgChange: false, // Не обновлять автоматически
        }
    );

    const [updateChat] = useUpdateChatMutation();
    const { isTestMode } = useTestMode();

    const [currentModel, setCurrentModel] = useState<MediaModel>('NANO_BANANA');
    const [pollingRequestId, setPollingRequestId] = useState<number | null>(
        null
    );
    // Локальное состояние для оптимистичного отображения pending-сообщения
    const [pendingMessage, setPendingMessage] = useState<PendingMessage | null>(
        null
    );
    const chatInputRef = useRef<ChatInputRef>(null);
    const isInitialLoadRef = useRef(true);
    const previousChatIdRef = useRef(chatIdNum);

    // Сброс состояния при смене чата
    useEffect(() => {
        if (previousChatIdRef.current !== chatIdNum) {
            isInitialLoadRef.current = true;
            previousChatIdRef.current = chatIdNum;
        }
    }, [chatIdNum]);

    // Синхронизация модели с настройками чата
    // ВАЖНО: Обновляем ТОЛЬКО при первоначальной загрузке чата
    // После этого модель может быть изменена ТОЛЬКО пользователем вручную через селектор
    // Все автоматические обновления чата (polling, refetch) НЕ влияют на выбранную модель
    useEffect(() => {
        const activeChatForSync = fullChat || chat;
        if (!activeChatForSync) return;

        // При первоначальной загрузке устанавливаем модель из чата
        if (isInitialLoadRef.current) {
            setCurrentModel(activeChatForSync.model);
            isInitialLoadRef.current = false;
            return;
        }

        // После первоначальной загрузки НЕ синхронизируем модель автоматически
        // Это предотвращает изменение модели при обновлениях чата после генерации
    }, [chat, fullChat]);

    // Обработка смены модели пользователем
    // ВАЖНО: Это единственный способ изменить модель после первоначальной загрузки
    async function handleModelChange(model: MediaModel) {
        // Если модель не изменилась, ничего не делаем
        if (model === currentModel) return;

        // Оптимистичное обновление UI
        const previousModel = currentModel;
        setCurrentModel(model);

        const activeChatForUpdate = fullChat || chat;
        if (activeChatForUpdate) {
            try {
                await updateChat({
                    id: activeChatForUpdate.id,
                    model,
                }).unwrap();
                // После успешного обновления на сервере модель остается установленной пользователем
                // и НЕ будет синхронизироваться автоматически при последующих обновлениях чата
            } catch (error) {
                // Откатываем изменение модели при ошибке
                setCurrentModel(previousModel);
                const errorMessage =
                    error &&
                    typeof error === 'object' &&
                    'data' in error &&
                    error.data &&
                    typeof error.data === 'object' &&
                    'error' in error.data &&
                    typeof error.data.error === 'string'
                        ? error.data.error
                        : 'Не удалось обновить модель. Попробуйте еще раз.';
                alert(`Ошибка переключения модели: ${errorMessage}`);
                console.error('[Chat] Ошибка обновления модели:', error);
            }
        }
    }

    // Polling для отслеживания статуса генерации (только если не тестовый режим)
    const shouldSkipPolling = !pollingRequestId || isTestMode;
    const { data: pollingRequest } = useGetRequestQuery(pollingRequestId!, {
        skip: shouldSkipPolling, // Не опрашиваем в тестовом режиме
        pollingInterval: isTestMode ? 0 : 1500, // Опрос каждые 1.5 секунды для более быстрого обновления
        // Принудительно обновляем данные при каждом запросе
        refetchOnMountOrArgChange: true,
    });

    // Обработчик добавления pending-сообщения (вызывается из ChatInput перед отправкой)
    function handleAddPendingMessage(prompt: string) {
        const pending: PendingMessage = {
            id: `pending-${Date.now()}`,
            prompt,
            model: currentModel,
            createdAt: new Date().toISOString(),
            status: 'PENDING',
        };
        setPendingMessage(pending);
        console.log('[Chat] ⏳ Добавлено pending-сообщение:', pending.id);
    }

    // Обработчик ошибки отправки (обновляет pending-сообщение на FAILED)
    function handleSendError(errorMessage: string) {
        setPendingMessage((prev) => {
            if (!prev) return null;
            console.log('[Chat] ❌ Pending-сообщение помечено как FAILED');
            return {
                ...prev,
                status: 'FAILED',
                errorMessage,
            };
        });
    }

    // Обработчик создания нового запроса (вызывается из ChatInput после успешной отправки)
    function handleRequestCreated(requestId: number) {
        console.log(
            '[Chat] ✅ Новый запрос создан, обновляем чат и запускаем polling:',
            { requestId }
        );

        // Сохраняем requestId в pending для точного сравнения
        setPendingMessage((prev) => {
            if (!prev) return null;
            return { ...prev, requestId };
        });

        // Обновляем оба кеша чата
        Promise.all([
            refetch(),
            !shouldSkipFullLoad ? refetchFull() : Promise.resolve(),
        ]).catch((error) => {
            console.error('[Chat] Ошибка при обновлении чата:', error);
        });

        // В тестовом режиме не запускаем polling
        if (isTestMode) {
            console.log(
                '[Chat] 🧪 Тестовый режим: polling отключен для нового запроса'
            );
            return;
        }

        // Запускаем polling для отслеживания статуса
        setPollingRequestId(requestId);
    }

    // Останавливаем polling при включении тестового режима
    useEffect(() => {
        if (isTestMode && pollingRequestId !== null) {
            console.log(
                '[Chat] 🧪 Тестовый режим включен: останавливаем polling'
            );
            setPollingRequestId(null);
        }
    }, [isTestMode, pollingRequestId]);

    // Обновляем чат когда статус запроса изменился
    // Используем ref для отслеживания предыдущего статуса, чтобы обновлять чат при любых изменениях
    const previousStatusRef = useRef<string | null>(null);
    const pollingStartTimeRef = useRef<number | null>(null);
    const maxPollingTime = 5 * 60 * 1000; // Максимальное время polling - 5 минут

    useEffect(() => {
        if (pollingRequestId && !pollingStartTimeRef.current) {
            // Запоминаем время начала polling
            pollingStartTimeRef.current = Date.now();
        }
    }, [pollingRequestId]);

    useEffect(() => {
        if (pollingRequest) {
            // ВАЖНО: Проверяем, что pollingRequest соответствует текущему pollingRequestId
            // При смене pollingRequestId, pollingRequest какое-то время содержит данные старого запроса
            if (pollingRequest.id !== pollingRequestId) {
                console.log('[Chat] ⚠️ pollingRequest.id не совпадает с pollingRequestId, игнорируем:', {
                    pollingRequestId: pollingRequest.id,
                    expectedId: pollingRequestId,
                });
                return;
            }

            const currentStatus = pollingRequest.status;
            const previousStatus = previousStatusRef.current;

            // Проверяем таймаут polling
            if (pollingStartTimeRef.current) {
                const pollingDuration =
                    Date.now() - pollingStartTimeRef.current;
                if (pollingDuration > maxPollingTime) {
                    console.warn(
                        '[Chat] ⚠️ Polling превысил максимальное время, останавливаем'
                    );
                    setPollingRequestId(null);
                    pollingStartTimeRef.current = null;
                    previousStatusRef.current = null;
                    // Принудительно обновляем чат при таймауте
                    refetch();
                    return;
                }
            }

            // Обновляем чат при первом получении данных или при изменении статуса
            const statusChanged = previousStatus !== currentStatus;
            const isFirstRequest = previousStatus === null;

            console.log('[Chat] Polling request статус:', {
                id: pollingRequest.id,
                status: currentStatus,
                previousStatus,
                statusChanged,
                isFirstRequest,
                filesCount: pollingRequest.files?.length || 0,
                errorMessage: pollingRequest.errorMessage || null,
            });

            // Обновляем pending-сообщение, чтобы убрать лоадер и показать ошибку сразу
            setPendingMessage((prev) => {
                if (!prev) return prev;
                if (!pollingRequestId || prev.requestId !== pollingRequestId) {
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

                if (
                    nextStatus === prev.status &&
                    nextError === prev.errorMessage
                ) {
                    return prev;
                }

                return {
                    ...prev,
                    status: nextStatus,
                    errorMessage: nextError,
                };
            });

            // Обновляем чат при первом получении данных (даже если уже FAILED) или при изменении статуса
            // Также обновляем периодически для PROCESSING статуса (каждые 5 секунд)
            const shouldUpdate =
                isFirstRequest ||
                statusChanged ||
                (currentStatus === 'PROCESSING' &&
                    previousStatus === 'PROCESSING' &&
                    Date.now() % 5000 < 1500); // Примерно каждые 5 секунд

            if (shouldUpdate) {
                console.log('[Chat] Обновляем чат');
                refetch().catch((error) => {
                    console.error('[Chat] Ошибка при обновлении чата:', error);
                });
            }

            // Останавливаем polling при завершении или ошибке
            if (currentStatus === 'COMPLETED' || currentStatus === 'FAILED') {
                console.log('[Chat] Запрос завершен, останавливаем polling');
                setPollingRequestId(null);
                pollingStartTimeRef.current = null;
                previousStatusRef.current = null; // Сбрасываем для следующего запроса

                // Финальное обновление чата для отображения финального статуса
                setTimeout(() => {
                    refetch().catch((error) => {
                        console.error(
                            '[Chat] Ошибка при финальном обновлении чата:',
                            error
                        );
                    });
                }, 500);
            } else {
                // Сохраняем текущий статус для следующей проверки
                previousStatusRef.current = currentStatus;
            }
        }
    }, [pollingRequest, pollingRequestId, refetch, maxPollingTime]);

    // Убираем pending-сообщение если реальный запрос появился
    // ВАЖНО: Этот useEffect должен быть ДО early returns для соблюдения правил хуков
    const activeRequests = fullChat?.requests || chat?.requests || [];
    useEffect(() => {
        if (!pendingMessage?.requestId) return;

        const requestAppeared = activeRequests.some(
            (r) => r.id === pendingMessage.requestId
        );

        const pollingMatched =
            pollingRequest && pollingRequest.id === pendingMessage.requestId;
        const pollingCompleted =
            pollingMatched &&
            (pollingRequest.status === 'COMPLETED' ||
                pollingRequest.status === 'FAILED');

        if (requestAppeared) {
            console.log(
                '[Chat] 🔄 Запрос найден, убираем pending-сообщение'
            );
            setPendingMessage(null);
        }
    }, [activeRequests, pendingMessage, pollingRequest]);

    // Показываем загрузку только если нет кешированных данных и идет первичная загрузка
    if (isChatLoading && !chat) {
        return (
            <div className='flex h-screen bg-slate-900'>
                <ChatSidebar />
                <div className='flex flex-1 items-center justify-center'>
                    <Loader2 className='h-8 w-8 animate-spin text-cyan-400' />
                </div>
            </div>
        );
    }

    // Показываем ошибку только если нет кешированных данных
    if (chatError && !chat) {
        return (
            <div className='flex h-screen bg-slate-900'>
                <ChatSidebar />
                <div className='flex flex-1 flex-col items-center justify-center text-center'>
                    <p className='text-xl text-red-400'>Ошибка загрузки чата</p>
                    <p className='text-sm text-slate-500 mt-2'>
                        Не удалось загрузить чат. Проверьте соединение с
                        сервером.
                    </p>
                </div>
            </div>
        );
    }

    // Показываем "не найден" только если нет кешированных данных и нет ошибки
    if (!chat && !isChatLoading && !chatError) {
        return (
            <div className='flex h-screen bg-slate-900'>
                <ChatSidebar />
                <div className='flex flex-1 flex-col items-center justify-center text-center'>
                    <p className='text-xl text-slate-400'>Чат не найден</p>
                    <p className='text-sm text-slate-500'>
                        Выберите чат из списка или создайте новый
                    </p>
                </div>
            </div>
        );
    }

    // Если есть кешированные данные, показываем их даже если идет обновление
    // Это обеспечивает мгновенное отображение из кеша

    // Если нет чата (не должно происходить после проверок выше, но для TypeScript)
    if (!chat) {
        return null;
    }

    // Используем полные данные если они загружены, иначе используем ограниченные
    const activeChat = fullChat || chat;

    // Сортируем запросы по дате (старые сверху)
    const sortedRequests = [...(activeChat.requests || [])].sort(
        (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Обновляем статус активного запроса если есть polling данные
    const requestsWithPolling = sortedRequests.map((request) => {
        if (pollingRequest && request.id === pollingRequest.id) {
            return pollingRequest;
        }
        return request;
    }) as MediaRequest[];

    // Добавляем pending-сообщение в конец списка (если есть)
    // Проверяем, что pending-сообщение еще не было заменено реальным запросом
    // Если есть requestId - сравниваем по нему (точное совпадение)
    // Если нет requestId - pending ещё не получил ответ от сервера, показываем его
    const hasPendingInList =
        pendingMessage &&
        !requestsWithPolling.some(
            (r) =>
                pendingMessage.requestId
                    ? r.id === pendingMessage.requestId // Сравниваем по реальному ID
                    : false // Пока нет requestId - реального запроса точно нет в списке
        );

    // Создаем объект для pending-сообщения в формате MediaRequest
    const pendingAsRequest: MediaRequest | null =
        hasPendingInList && pendingMessage
            ? {
                  id: -1, // Временный ID
                  chatId: chatIdNum,
                  prompt: pendingMessage.prompt,
                  model: pendingMessage.model,
                  status: pendingMessage.status,
                  inputFiles: [],
                  errorMessage: pendingMessage.errorMessage || null,
                  createdAt: pendingMessage.createdAt,
                  completedAt: null,
                  files: [],
              }
            : null;

    // Финальный список запросов с pending-сообщением
    const finalRequests = pendingAsRequest
        ? [...requestsWithPolling, pendingAsRequest]
        : requestsWithPolling;

    // Обработчик редактирования промпта
    function handleEditPrompt(prompt: string) {
        chatInputRef.current?.setPrompt(prompt);
    }

    // Обработчик прикрепления файла
    async function handleAttachFile(fileUrl: string, filename: string) {
        await chatInputRef.current?.addFileFromUrl(fileUrl, filename);
    }

    // Показываем индикатор обновления только если есть кешированные данные
    const showUpdatingIndicator = isChatFetching && !isChatLoading;

    return (
        <div className='flex h-screen bg-slate-900'>
            {/* Сайдбар */}
            <ChatSidebar />

            {/* Основной чат */}
            <div className='flex flex-1 flex-col'>
                {/* Заголовок чата */}
                <ChatHeader
                    name={activeChat.name}
                    model={currentModel}
                    showUpdating={showUpdatingIndicator}
                />

                {/* Список сообщений */}
                <MessageList
                    requests={finalRequests}
                    chatModel={currentModel}
                    onEditPrompt={handleEditPrompt}
                    onAttachFile={handleAttachFile}
                />

                {/* Ввод */}
                <ChatInput
                    ref={chatInputRef}
                    chatId={chatIdNum}
                    currentModel={currentModel}
                    onModelChange={handleModelChange}
                    onRequestCreated={handleRequestCreated}
                    onPendingMessage={handleAddPendingMessage}
                    onSendError={handleSendError}
                />
            </div>

            {/* Панель с медиафайлами */}
            <MediaGallery
                requests={requestsWithPolling}
                onAttachFile={handleAttachFile}
                isLoading={isChatLoading || isFullChatLoading}
            />
        </div>
    );
}

interface ChatHeaderProps {
    name: string;
    model: MediaModel;
    showUpdating?: boolean;
}

function ChatHeader({ name, model, showUpdating }: ChatHeaderProps) {
    const { data: models } = useGetModelsQuery();
    const modelInfo = models?.find((m) => m.key === model);

    return (
        <div className={cn(PANEL_HEADER_CLASSES, 'bg-slate-800/50')}>
            <div className='flex items-center gap-3'>
                <span className='text-2xl'>{getModelIcon(model)}</span>
                <div className='flex-1'>
                    <div className='flex items-center gap-2'>
                        <h1 className='font-semibold text-white'>{name}</h1>
                        {showUpdating && (
                            <Loader2 className='h-4 w-4 animate-spin text-slate-400' />
                        )}
                    </div>
                    <p className='text-xs text-slate-400'>
                        {modelInfo?.name || model}
                    </p>
                </div>
            </div>
        </div>
    );
}
