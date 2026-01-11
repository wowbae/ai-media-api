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

    // Мемоизируем строку статусов для предотвращения бесконечных ре-рендеров
    // Используем стабильную строку на основе ID и статуса (без errorMessage для уменьшения частоты обновлений)
    const requestsStatusKey = useMemo(
        () => requests.map((r) => `${r.id}-${r.status}`).join('|'),
        [requests]
    );

    const [showScrollButton, setShowScrollButton] = useState(false);

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
                <div className='mb-4 rounded-full bg-slate-800 p-6'>
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

    return (
        <div className='relative flex-1 overflow-hidden'>
            <ScrollArea className='h-full bg-slate-900' ref={scrollRef}>
                <div className='space-y-6 p-4'>
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
                    className='absolute bottom-4 right-8 z-10 h-10 w-10 rounded-full bg-slate-800/80 text-white shadow-lg backdrop-blur-sm hover:bg-slate-700'
                    onClick={scrollToBottom}
                >
                    <ChevronDown className='h-6 w-6' />
                </Button>
            )}
        </div>
    );
}
