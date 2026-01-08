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
    } = useGetChatQuery({ id: chatIdNum, limit: 3 }, {
        // Показывать кешированные данные немедленно
        refetchOnMountOrArgChange: 10, // Обновлять только если данные старше 10 секунд
        // Показывать данные из кеша даже при ошибке сети
        skip: false,
    });

    // Фоновая подгрузка всех requests после первоначальной загрузки
    const shouldSkipFullLoad =
        isChatLoading ||
        !chat ||
        (chat._count && chat.requests.length >= chat._count.requests); // Пропускаем если уже загружены все requests

    const {
        data: fullChat,
        isLoading: isFullChatLoading,
    } = useGetChatQuery({ id: chatIdNum }, {
        skip: shouldSkipFullLoad,
        refetchOnMountOrArgChange: false, // Не обновлять автоматически
    });

    const [updateChat] = useUpdateChatMutation();
    const { isTestMode } = useTestMode();

    const [currentModel, setCurrentModel] = useState<MediaModel>('NANO_BANANA');
    const [pollingRequestId, setPollingRequestId] = useState<number | null>(null);
    const chatInputRef = useRef<ChatInputRef>(null);

    // Синхронизация модели с настройками чата
    useEffect(() => {
        const activeChatForSync = fullChat || chat;
        if (activeChatForSync) {
            setCurrentModel(activeChatForSync.model);
        }
    }, [chat, fullChat]);

    // Обработка смены модели
    async function handleModelChange(model: MediaModel) {
        // Оптимистичное обновление UI
        const previousModel = currentModel;
        setCurrentModel(model);

        const activeChatForUpdate = fullChat || chat;
        if (activeChatForUpdate) {
            try {
                await updateChat({ id: activeChatForUpdate.id, model }).unwrap();
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
        pollingInterval: isTestMode ? 0 : 2000, // Опрос каждые 2 секунды только в обычном режиме
    });

    // Обработчик создания нового запроса (вызывается из ChatInput после успешной отправки)
    function handleRequestCreated(requestId: number) {
        // В тестовом режиме не запускаем polling
        if (isTestMode) {
            console.log('[Chat] 🧪 Тестовый режим: polling отключен для нового запроса');
            return;
        }

        console.log('[Chat] Новый запрос создан, запускаем polling:', { requestId });
        setPollingRequestId(requestId);
    }

    // Останавливаем polling при включении тестового режима
    useEffect(() => {
        if (isTestMode && pollingRequestId !== null) {
            console.log('[Chat] 🧪 Тестовый режим включен: останавливаем polling');
            setPollingRequestId(null);
        }
    }, [isTestMode, pollingRequestId]);

    // Обновляем чат когда статус запроса изменился
    useEffect(() => {
        if (pollingRequest) {
            console.log('[Chat] Polling request статус:', {
                id: pollingRequest.id,
                status: pollingRequest.status,
                filesCount: pollingRequest.files?.length || 0,
            });

            if (pollingRequest.status === 'COMPLETED' || pollingRequest.status === 'FAILED') {
                console.log('[Chat] Запрос завершен, обновляем чат');
                refetch();
                setPollingRequestId(null);
            }
        }
    }, [pollingRequest, refetch]);

    // Показываем загрузку только если нет кешированных данных и идет первичная загрузка
    if (isChatLoading && !chat) {
        return (
            <div className="flex h-screen bg-slate-900">
                <ChatSidebar />
                <div className="flex flex-1 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
                </div>
            </div>
        );
    }

    // Показываем ошибку только если нет кешированных данных
    if (chatError && !chat) {
        return (
            <div className="flex h-screen bg-slate-900">
                <ChatSidebar />
                <div className="flex flex-1 flex-col items-center justify-center text-center">
                    <p className="text-xl text-red-400">Ошибка загрузки чата</p>
                    <p className="text-sm text-slate-500 mt-2">
                        Не удалось загрузить чат. Проверьте соединение с сервером.
                    </p>
                </div>
            </div>
        );
    }

    // Показываем "не найден" только если нет кешированных данных и нет ошибки
    if (!chat && !isChatLoading && !chatError) {
        return (
            <div className="flex h-screen bg-slate-900">
                <ChatSidebar />
                <div className="flex flex-1 flex-col items-center justify-center text-center">
                    <p className="text-xl text-slate-400">Чат не найден</p>
                    <p className="text-sm text-slate-500">
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
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Обновляем статус активного запроса если есть polling данные
    const requestsWithPolling = sortedRequests.map((request) => {
        if (pollingRequest && request.id === pollingRequest.id) {
            return pollingRequest;
        }
        return request;
    }) as MediaRequest[];

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
        <div className="flex h-screen bg-slate-900">
            {/* Сайдбар */}
            <ChatSidebar />

            {/* Основной чат */}
            <div className="flex flex-1 flex-col">
                {/* Заголовок чата */}
                <ChatHeader name={activeChat.name} model={currentModel} showUpdating={showUpdatingIndicator} />

                {/* Список сообщений */}
                <MessageList
                    requests={requestsWithPolling}
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
                />
            </div>

            {/* Панель с медиафайлами */}
            <MediaGallery
                requests={requestsWithPolling}
                onAttachFile={handleAttachFile}
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
            <div className="flex items-center gap-3">
                <span className="text-2xl">{getModelIcon(model)}</span>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h1 className="font-semibold text-white">{name}</h1>
                        {showUpdating && (
                            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                        )}
                    </div>
                    <p className="text-xs text-slate-400">
                        {modelInfo?.name || model}
                    </p>
                </div>
            </div>
        </div>
    );
}

