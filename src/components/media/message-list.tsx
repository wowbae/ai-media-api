// Список сообщений (запросов и результатов)
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ModelBadge } from './model-selector';
import { type MediaRequest, type MediaModel } from '@/redux/media-api';
import { MessageItem } from './message-item';
import { MessageSkeleton } from './message-skeleton';

interface MessageListProps {
    requests: MediaRequest[];
    chatModel: MediaModel;
    isLoading?: boolean;
    onEditPrompt?: (prompt: string) => void;
    onAttachFile?: (fileUrl: string, filename: string) => void;
    onRepeatRequest?: (request: MediaRequest, model?: MediaModel) => void;
}

export function MessageList({
    requests,
    chatModel,
    isLoading,
    onEditPrompt,
    onAttachFile,
    onRepeatRequest,
}: MessageListProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [inputPanelHeight, setInputPanelHeight] = useState(0);

    // Мемоизируем строку статусов для предотвращения бесконечных ре-рендеров
    // Используем стабильную строку на основе ID и статуса (без errorMessage для уменьшения частоты обновлений)
    const requestsStatusKey = useMemo(
        () => requests.map((r) => `${r.id}-${r.status}`).join('|'),
        [requests]
    );

    const [showScrollButton, setShowScrollButton] = useState(false);

    // Отслеживание высоты панели ввода для динамического позиционирования кнопки
    useEffect(() => {
        const inputPanel = document.getElementById('chat-input');
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
            viewport.addEventListener('scroll', handleScroll);
            return () => viewport.removeEventListener('scroll', handleScroll);
        }
    }, [handleScroll]);

    // Автопрокрутка к последнему сообщению
    // Используем scrollIntoView на элементе-маркере в конце списка
    useEffect(() => {
        // Если пользователь не в самом низу, не прокручиваем автоматически (опционально)
        // Но здесь мы оставим как было, чтобы новые сообщения всегда были видны
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (messagesEndRef.current) {
                    messagesEndRef.current.scrollIntoView({
                        behavior: 'smooth',
                    });
                }
            });
        });
    }, [requests.length, requestsStatusKey]);

    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    if (isLoading) {
        return (
            <div className='flex-1 p-4'>
                <MessageSkeleton />
                <MessageSkeleton />
                <MessageSkeleton />
            </div>
        );
    }

    if (requests.length === 0) {
        return (
            <div className='flex flex-1 flex-col items-center justify-center p-8 text-center'>
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
                    <ModelBadge model={chatModel} />
                </div>
            </div>
        );
    }

    // Вычисляем нижний отступ списка сообщений (высота панели ввода + отступ снизу + зазор)
    const bottomPadding = inputPanelHeight > 0
        ? inputPanelHeight + 24 + 16 // 24px (bottom-6) + 16px (зазор)
        : 300; // Значение по умолчанию до загрузки

    // Вычисляем позицию кнопки (высота панели ввода + отступ снизу + 4 единицы выше)
    const buttonBottom = inputPanelHeight > 0
        ? inputPanelHeight + 24 + 16 // 24px (bottom-6) + 16px (4 единицы выше)
        : 290; // Значение по умолчанию до загрузки

    return (
        <div className='relative flex-1 overflow-hidden min-h-0'>
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

            {showScrollButton && (
                <Button
                    size='icon'
                    variant='secondary'
                    className='absolute right-18 z-30 h-10 w-10 rounded-full bg-secondary/80 text-foreground shadow-lg backdrop-blur-sm hover:bg-secondary'
                    style={{ bottom: `${buttonBottom}px` }}
                    onClick={scrollToBottom}
                >
                    <ChevronDown className='h-6 w-6' />
                </Button>
            )}
        </div>
    );
}
