// Список сообщений (запросов и результатов)
import { useEffect, useRef } from 'react';
import {
    Loader2,
    AlertCircle,
    Clock,
    CheckCircle2,
    Paperclip,
    Trash2,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MediaPreview } from './media-preview';
import { ModelBadge } from './model-selector';
import {
    type MediaRequest,
    type RequestStatus,
    type MediaModel,
    useDeleteFileMutation,
} from '@/redux/media-api';
import { getMediaFileUrl } from '@/lib/constants';

interface MessageListProps {
    requests: MediaRequest[];
    chatModel: MediaModel;
    isLoading?: boolean;
    onEditPrompt?: (prompt: string) => void;
    onAttachFile?: (fileUrl: string, filename: string) => void;
}

export function MessageList({
    requests,
    chatModel,
    isLoading,
    onEditPrompt,
    onAttachFile,
}: MessageListProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Автопрокрутка к последнему сообщению
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [requests.length]);

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
        <ScrollArea className='flex-1 bg-slate-900' ref={scrollRef}>
            <div className='space-y-6 p-4'>
                {requests.map((request) => (
                    <MessageItem
                        key={request.id}
                        request={request}
                        onEditPrompt={onEditPrompt}
                        onAttachFile={onAttachFile}
                    />
                ))}
            </div>
        </ScrollArea>
    );
}

interface MessageItemProps {
    request: MediaRequest;
    onEditPrompt?: (prompt: string) => void;
    onAttachFile?: (fileUrl: string, filename: string) => void;
}

function MessageItem({
    request,
    onEditPrompt,
    onAttachFile,
}: MessageItemProps) {
    const [deleteFile, { isLoading: isDeleting }] = useDeleteFileMutation();

    async function handleDeleteFile(event: React.MouseEvent, fileId: number) {
        event.stopPropagation();
        try {
            await deleteFile(fileId).unwrap();
        } catch (error) {
            console.error('Ошибка удаления файла:', error);
        }
    }

    // Определение класса фона для ответа нейросети
    function getResponseBackgroundClass(): string {
        if (request.status === 'FAILED') {
            return 'bg-red-950/50 border border-red-900/30';
        }
        // Синеватый фон в тему с глобальным bg-slate-900
        return 'bg-slate-800/60 border border-slate-700/50';
    }

    return (
        <div className='space-y-3'>
            {/* Промпт пользователя */}
            <div className='group flex items-start justify-end gap-2'>
                {/* Кнопка редактирования слева от сообщения */}
                {onEditPrompt && (
                    <Button
                        type='button'
                        size='icon'
                        variant='ghost'
                        className='mt-1 h-8 w-8 shrink-0 text-cyan-400 opacity-0 transition-opacity hover:text-cyan-300 hover:bg-cyan-600/20 group-hover:opacity-100'
                        onClick={() => onEditPrompt(request.prompt)}
                        title='Редактировать промпт'
                    >
                        <span className='text-lg'>✨</span>
                    </Button>
                )}
                <div className='max-w-[80%] rounded-2xl rounded-tr-sm bg-cyan-600 px-4 py-3'>
                    <p className='whitespace-pre-wrap text-white'>
                        {request.prompt}
                    </p>
                    <p className='mt-1 text-right text-xs text-cyan-200/70'>
                        {formatTime(request.createdAt)}
                    </p>
                </div>
            </div>

            {/* Ответ системы */}
            <div className='flex justify-start'>
                <div className='max-w-[80%] space-y-3'>
                    {/* Статус, ошибки, загрузка - только если нет файлов или есть ошибка */}
                    {(request.status !== 'COMPLETED' ||
                        (request.status === 'COMPLETED' &&
                            request.files.length === 0)) && (
                        <div className={`rounded-2xl rounded-tl-sm px-4 py-3 ${getResponseBackgroundClass()}`}>
                            {/* Статус */}
                            <StatusBadge status={request.status} />

                            {/* Ошибка */}
                            {request.status === 'FAILED' &&
                                request.errorMessage && (
                                    <div className='mt-2 flex items-start gap-2 rounded-lg bg-red-900/30 p-3 text-red-300'>
                                        <AlertCircle className='mt-0.5 h-4 w-4 shrink-0' />
                                        <p className='text-sm'>
                                            {request.errorMessage}
                                        </p>
                                    </div>
                                )}

                            {/* Загрузка с скелетоном */}
                            {(request.status === 'PENDING' ||
                                request.status === 'PROCESSING') && (
                                <div className='mt-3 space-y-3'>
                                    {/* Скелетон-placeholder для изображения */}
                                    <Skeleton className='aspect-square w-48 rounded-xl' />
                                    <div hidden className='flex items-center gap-2 text-slate-400'>
                                        <Loader2 className='h-4 w-4 animate-spin' />
                                        <span className='text-sm'>
                                            {request.status === 'PENDING'
                                                ? 'В очереди...'
                                                : 'Креативим...'}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Сообщение об отсутствии файлов */}
                            {request.status === 'COMPLETED' &&
                                request.files.length === 0 && (
                                    <div className='mt-2 rounded-lg bg-yellow-900/30 p-3 text-yellow-300'>
                                        <p className='text-sm'>
                                            ⚠️ Генерация завершена, но файлы не
                                            найдены
                                        </p>
                                    </div>
                                )}

                            {/* Время завершения */}
                            {request.completedAt && (
                                <p className='mt-2 text-xs text-slate-500'>
                                    Завершено: {formatTime(request.completedAt)}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Результаты с файлами - фон по размеру превью */}
                    {request.status === 'COMPLETED' &&
                        request.files.length > 0 && (
                            <div className='space-y-3'>
                                <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                                    {request.files.map((file) => {
                                        // console.log(
                                        //     '[MessageList] Отображение файла:',
                                        //     {
                                        //         id: file.id,
                                        //         filename: file.filename,
                                        //         path: file.path,
                                        //         type: file.type,
                                        //     }
                                        // );
                                        return (
                                            <div
                                                key={file.id}
                                                className='group flex items-start gap-2'
                                            >
                                                <div className={`inline-block w-fit rounded-2xl rounded-tl-sm p-2 ${getResponseBackgroundClass()}`}>
                                                    <MediaPreview
                                                        file={file}
                                                        onAttach={onAttachFile}
                                                    />
                                                </div>
                                                {/* Кнопки действий справа от превью в вертикальной колонке */}
                                                <div className='mt-1 flex flex-col gap-1'>
                                                    {/* Кнопка прикрепления */}
                                                    {file.type === 'IMAGE' &&
                                                        onAttachFile && (
                                                            <Button
                                                                type='button'
                                                                size='icon'
                                                                variant='ghost'
                                                                className='h-8 w-8 shrink-0 text-slate-400 opacity-0 transition-opacity hover:text-cyan-400 hover:bg-slate-600/50 group-hover:opacity-100'
                                                                onClick={() => {
                                                                    const fileUrl = getMediaFileUrl(file.path);
                                                                    onAttachFile(
                                                                        fileUrl,
                                                                        file.filename
                                                                    );
                                                                }}
                                                                title='Прикрепить к промпту'
                                                            >
                                                                <Paperclip className='h-4 w-4' />
                                                            </Button>
                                                        )}
                                                    {/* Кнопка удаления */}
                                                    <Button
                                                        type='button'
                                                        size='icon'
                                                        variant='ghost'
                                                        className='h-8 w-8 shrink-0 text-slate-400 opacity-0 transition-opacity hover:text-red-400 hover:bg-red-600/20 group-hover:opacity-100'
                                                        onClick={(e) =>
                                                            handleDeleteFile(
                                                                e,
                                                                file.id
                                                            )
                                                        }
                                                        disabled={isDeleting}
                                                        title='Удалить файл'
                                                    >
                                                        <Trash2 className='h-4 w-4' />
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                {/* Время завершения под файлами */}
                                {request.completedAt && (
                                    <p className='text-xs text-slate-500'>
                                        Завершено:{' '}
                                        {formatTime(request.completedAt)}
                                    </p>
                                )}
                            </div>
                        )}
                </div>
            </div>
        </div>
    );
}

interface StatusBadgeProps {
    status: RequestStatus;
}

function StatusBadge({ status }: StatusBadgeProps) {
    const config = {
        PENDING: {
            icon: Clock,
            label: 'В очереди',
            className: 'bg-yellow-900/30 text-yellow-400',
        },
        PROCESSING: {
            icon: Loader2,
            label: 'Генерация',
            className: 'bg-blue-900/30 text-blue-400',
        },
        COMPLETED: {
            icon: CheckCircle2,
            label: 'Готово',
            className: 'bg-green-900/30 text-green-400',
        },
        FAILED: {
            icon: AlertCircle,
            label: 'Ошибка',
            className: 'bg-red-900/30 text-red-400',
        },
    };

    const { icon: Icon, label, className } = config[status];

    return (
        <Badge variant='secondary' className={className}>
            <Icon
                className={`mr-1 h-3 w-3 ${status === 'PROCESSING' ? 'animate-spin' : ''}`}
            />
            {label}
        </Badge>
    );
}

function MessageSkeleton() {
    return (
        <div className='mb-6 space-y-3'>
            <div className='flex justify-end'>
                <Skeleton className='h-16 w-64 rounded-2xl' />
            </div>
            <div className='flex justify-start'>
                <Skeleton className='h-48 w-80 rounded-2xl' />
            </div>
        </div>
    );
}

function formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
    });
}
