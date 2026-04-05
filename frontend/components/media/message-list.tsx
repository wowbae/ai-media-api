// Список сообщений (запросов и результатов)
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ModelBadge } from "./model-selector";
import { type MediaRequest, type MediaModel } from "@/redux/media-api";
import { MessageItem } from "./message-item";
import { MessageSkeleton } from "./message-skeleton";
import type { AppMode } from "@/lib/app-mode";
import { APP_MODES } from "@/lib/app-mode";

interface MessageListProps {
    requests: MediaRequest[];
    chatModel: MediaModel;
    isLoading?: boolean;
    onEditPrompt?: (prompt: string) => void;
    onAttachFile?: (
        fileUrl: string,
        filename: string,
        imgbbUrl?: string,
    ) => void;
    onRepeatRequest?: (request: MediaRequest, model?: MediaModel) => void;
    onScrollStateChange?: (showButton: boolean) => void;
    onScrollToBottomRef?: (scrollFn: () => void) => void;
    appMode?: AppMode;
}

export function MessageList({
    requests,
    chatModel,
    isLoading,
    onEditPrompt,
    onAttachFile,
    onRepeatRequest,
    onScrollStateChange,
    onScrollToBottomRef,
    appMode = APP_MODES.DEFAULT,
}: MessageListProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [inputPanelHeight, setInputPanelHeight] = useState(0);

    // Мемоизируем строку статусов для предотвращения бесконечных ре-рендеров
    // Используем стабильную строку на основе ID и статуса (без errorMessage для уменьшения частоты обновлений)
    const requestsStatusKey = useMemo(
        () => requests.map((r) => `${r.id}-${r.status}`).join("|"),
        [requests],
    );

    const [showScrollButton, setShowScrollButton] = useState(false);

    // Уведомляем родительский компонент об изменении состояния кнопки
    useEffect(() => {
        onScrollStateChange?.(showScrollButton);
    }, [showScrollButton, onScrollStateChange]);

    // Экспортируем функцию прокрутки через callback ref
    const scrollToBottom = useCallback(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
                inline: "nearest",
            });
        }
    }, []);

    useEffect(() => {
        onScrollToBottomRef?.(scrollToBottom);
    }, [scrollToBottom, onScrollToBottomRef]);

    // Отслеживание высоты панели ввода для динамического позиционирования кнопки
    useEffect(() => {
        const inputPanel = document.getElementById("chat-input");
        if (!inputPanel) return;

        const updateInputPanelHeight = () => {
            const height = inputPanel.offsetHeight;
            setInputPanelHeight(height);
        };

        // Обновляем высоту при загрузке
        updateInputPanelHeight();

        // Используем ResizeObserver для отслеживания изменений размера
        const resizeObserver = new ResizeObserver(() => {
            updateInputPanelHeight();
        });

        resizeObserver.observe(inputPanel);

        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    // Обработчик скролла для отображения кнопки "Вниз"
    const handleScroll = useCallback(() => {
        if (scrollRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
            // Показываем кнопку, если отступили от низа более чем на 200 пикселей
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
            setShowScrollButton(!isNearBottom);
        }
    }, []);

    // Привязываем обработчик скролла к вьюпорту
    useEffect(() => {
        const viewport = scrollRef.current;
        if (viewport) {
            viewport.addEventListener("scroll", handleScroll);
            return () => viewport.removeEventListener("scroll", handleScroll);
        }
    }, [handleScroll]);

    // Автопрокрутка к последнему сообщению
    // Используем scrollIntoView на элементе-маркере в конце списка
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
                inline: "nearest",
            });
        }, 0);
        return () => clearTimeout(timeoutId);
    }, [requests.length, requestsStatusKey]);

    if (isLoading) {
        return (
            <div className='min-h-0 flex-1 p-4'>
                <MessageSkeleton />
                <MessageSkeleton />
                <MessageSkeleton />
            </div>
        );
    }

    if (requests.length === 0) {
        return (
            <div className='flex min-h-0 flex-1 flex-col items-center justify-center p-8 text-center'>
                <div className='mb-4 rounded-full bg-secondary p-6'>
                    <span className='text-4xl'>🎨</span>
                </div>
                <h3 className='mb-2 text-xl font-semibold text-white'>
                    Начните генерацию
                </h3>
                <p className='max-w-md text-slate-400'>
                    Введите промпт и нажмите отправить, чтобы сгенерировать
                    изображение, видео или аудио с помощью AI
                </p>
                <div className='mt-4'>
                    <ModelBadge model={chatModel} appMode={appMode} />
                </div>
            </div>
        );
    }

    // Вычисляем нижний отступ списка сообщений (высота панели ввода + отступ снизу + зазор)
    const bottomPadding =
        inputPanelHeight > 0
            ? inputPanelHeight + 24 + 16 // 24px (bottom-6) + 16px (зазор)
            : 300; // Значение по умолчанию до загрузки

    return (
        <div className='relative flex-1 overflow-hidden min-h-0 mx-0'>
            <ScrollArea className='h-full bg-background' ref={scrollRef}>
                <div
                    className='space-y-6 p-4'
                    style={{ paddingBottom: `${bottomPadding}px` }}
                >
                    {requests.map((request) => (
                        <MessageItem
                            key={request.id}
                            request={request}
                            onEditPrompt={onEditPrompt}
                            onAttachFile={onAttachFile}
                            onRepeatRequest={onRepeatRequest}
                        />
                    ))}
                    {/* Маркер для автоскролла */}
                    <div ref={messagesEndRef} />
                </div>
            </ScrollArea>
        </div>
    );
}
