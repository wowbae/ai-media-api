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
    type MediaModel,
    type MediaRequest,
} from '@/redux/media-api';
import { PANEL_HEADER_CLASSES } from '@/lib/panel-styles';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/media/$chatId')({
    component: MediaChatPage,
});

function MediaChatPage() {
    const { chatId } = Route.useParams();
    const chatIdNum = parseInt(chatId);

    const { data: chat, isLoading: isChatLoading, refetch } = useGetChatQuery(chatIdNum);
    const [updateChat] = useUpdateChatMutation();

    const [currentModel, setCurrentModel] = useState<MediaModel>('NANO_BANANA');
    const [pollingRequestId, setPollingRequestId] = useState<number | null>(null);
    const chatInputRef = useRef<ChatInputRef>(null);

    // Синхронизация модели с настройками чата
    useEffect(() => {
        if (chat) {
            setCurrentModel(chat.model);
        }
    }, [chat]);

    // Обработка смены модели
    async function handleModelChange(model: MediaModel) {
        setCurrentModel(model);
        if (chat) {
            await updateChat({ id: chat.id, model });
        }
    }

    // Polling для отслеживания статуса генерации
    const { data: pollingRequest } = useGetRequestQuery(pollingRequestId!, {
        skip: !pollingRequestId,
        pollingInterval: 2000, // опрос каждые 2 секунды
    });

    // Следим за активными запросами для polling
    useEffect(() => {
        if (chat?.requests) {
            const pendingRequest = chat.requests.find(
                (r) => r.status === 'PENDING' || r.status === 'PROCESSING'
            );
            if (pendingRequest) {
                setPollingRequestId(pendingRequest.id);
            } else {
                setPollingRequestId(null);
            }
        }
    }, [chat?.requests]);

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

    if (isChatLoading) {
        return (
            <div className="flex h-screen bg-slate-900">
                <ChatSidebar />
                <div className="flex flex-1 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
                </div>
            </div>
        );
    }

    if (!chat) {
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

    // Сортируем запросы по дате (старые сверху)
    const sortedRequests = [...(chat.requests || [])].sort(
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

    return (
        <div className="flex h-screen bg-slate-900">
            {/* Сайдбар */}
            <ChatSidebar />

            {/* Основной чат */}
            <div className="flex flex-1 flex-col">
                {/* Заголовок чата */}
                <ChatHeader name={chat.name} model={currentModel} />

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
                />
            </div>

            {/* Панель с медиафайлами */}
            <MediaGallery requests={requestsWithPolling} />
        </div>
    );
}

interface ChatHeaderProps {
    name: string;
    model: MediaModel;
}

function ChatHeader({ name, model }: ChatHeaderProps) {
    function getModelEmoji(m: MediaModel) {
        switch (m) {
            case 'NANO_BANANA':
                return '🍌';
            case 'KLING':
                return '🎬';
            case 'MIDJOURNEY':
                return '🎨';
            default:
                return '✨';
        }
    }

    return (
        <div className={cn(PANEL_HEADER_CLASSES, 'bg-slate-800/50')}>
            <div className="flex items-center gap-3">
                <span className="text-2xl">{getModelEmoji(model)}</span>
                <div>
                    <h1 className="font-semibold text-white">{name}</h1>
                    <p className="text-xs text-slate-400">
                        {model === 'NANO_BANANA' && 'Nano Banana 2 Pro'}
                        {model === 'KLING' && 'Kling AI Video'}
                        {model === 'MIDJOURNEY' && 'Midjourney'}
                    </p>
                </div>
            </div>
        </div>
    );
}

