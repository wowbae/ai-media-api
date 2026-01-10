// Список сообщений (запросов и результатов)
import { useEffect, useRef, useState, useMemo } from 'react';
import {
    Loader2,
    AlertCircle,
    Clock,
    CheckCircle2,
    Paperclip,
    Trash2,
    Maximize2,
    Download,
    X,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { MediaPreview } from './media-preview';
import { ModelBadge } from './model-selector';
import {
    type MediaRequest,
    type RequestStatus,
    type MediaModel,
    type MediaFile,
    useDeleteFileMutation,
    useGetModelsQuery,
} from '@/redux/media-api';
import { getMediaFileUrl } from '@/lib/constants';
import { downloadFile } from '@/lib/utils';

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
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Мемоизируем строку статусов для предотвращения бесконечных ре-рендеров
    // Используем стабильную строку на основе ID и статуса (без errorMessage для уменьшения частоты обновлений)
    const requestsStatusKey = useMemo(
        () => requests.map((r) => `${r.id}-${r.status}`).join('|'),
        [requests]
    );

    // Автопрокрутка к последнему сообщению
    // Используем scrollIntoView на элементе-маркере в конце списка
    useEffect(() => {
        // Используем двойной requestAnimationFrame для гарантии, что DOM полностью обновлен
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
                {/* Маркер для автоскролла */}
                <div ref={messagesEndRef} />
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
    const { data: models } = useGetModelsQuery();
    const [fullscreenVideo, setFullscreenVideo] = useState<MediaFile | null>(
        null
    );
    const [attachingFile, setAttachingFile] = useState(false);

    // Получаем информацию о модели и провайдере из сохранённой модели запроса
    // Показываем только если модель сохранена в запросе
    function getModelInfo(model: MediaModel | null) {
        if (!model) return null;
        return models?.find((m) => m.key === model);
    }

    const modelInfo = getModelInfo(request.model);
    const providerName = modelInfo?.provider
        ? getProviderDisplayName(modelInfo.provider)
        : null;

    async function handleDeleteFile(event: React.MouseEvent, fileId: number) {
        event.stopPropagation();
        try {
            await deleteFile(fileId).unwrap();
        } catch (error) {
            console.error('Ошибка удаления файла:', error);
        }
    }

    function loadingEffectForAttachFile() {
        setAttachingFile(true);
        setTimeout(() => {
            setAttachingFile(false);
        }, 1500);
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
                    <p className='whitespace-pre-wrap text-white text-sm'>
                        {request.prompt}
                    </p>
                    {/* Превью прикрепленных файлов */}
                    {request.inputFiles && request.inputFiles.length > 0 && (
                        <div className='mt-2 flex flex-wrap gap-2'>
                            {request.inputFiles.map((fileUrl, index) => {
                                // Пропускаем пустые значения
                                if (!fileUrl) {
                                    return null;
                                }

                                // Поддерживаем data URL (base64) и HTTP/HTTPS URL (imgbb)
                                const isDataUrl = fileUrl.startsWith('data:');
                                const isHttpUrl = fileUrl.startsWith('http://') || fileUrl.startsWith('https://');

                                // Если это не data URL и не HTTP URL - пропускаем
                                if (!isDataUrl && !isHttpUrl) {
                                    return null;
                                }

                                // Определяем, является ли это видео
                                // Для data URL проверяем MIME type
                                // Для HTTP URL - предполагаем изображение (imgbb не поддерживает видео)
                                let isVideo = false;
                                if (isDataUrl) {
                                    isVideo = isVideoDataUrl(fileUrl);
                                } else if (isHttpUrl) {
                                    // HTTP URL от imgbb - всегда изображения (видео остаются как base64)
                                    isVideo = false;
                                }

                                return (
                                    <div
                                        key={index}
                                        className='h-16 w-16 overflow-hidden rounded-lg border border-cyan-500/30'
                                    >
                                        {isVideo ? (
                                            <video
                                                src={fileUrl}
                                                className='h-full w-full object-cover'
                                                muted
                                            />
                                        ) : (
                                            <img
                                                src={fileUrl}
                                                alt={`Прикрепленный файл ${index + 1}`}
                                                className='h-full w-full object-cover'
                                                crossOrigin='anonymous'
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    <div className='mt-1 flex items-center justify-end gap-2 text-xs text-cyan-200/70'>
                        {modelInfo && (
                            <span className='flex items-center gap-1'>
                                {modelInfo.name}
                                {providerName && (
                                    <span className='text-cyan-300/60'>
                                        • {providerName}
                                    </span>
                                )}
                            </span>
                        )}
                        <span>{formatTime(request.createdAt)}</span>
                    </div>
                </div>
            </div>

            {/* Ответ системы */}
            <div className='flex justify-start'>
                <div className='max-w-[80%] space-y-3'>
                    {/* Статус, ошибки, загрузка - только если нет файлов или есть ошибка */}
                    {(request.status !== 'COMPLETED' ||
                        (request.status === 'COMPLETED' &&
                            request.files.length === 0)) && (
                        <div
                            className={`rounded-2xl rounded-tl-sm px-4 py-3 ${getResponseBackgroundClass()}`}
                        >
                            {/* Статус */}
                            <StatusBadge status={request.status} />

                            {/* Ошибка */}
                            {request.status === 'FAILED' &&
                                request.errorMessage && (
                                    <div className='mt-2 flex items-start gap-2 rounded-lg bg-red-900/30 p-3 text-red-300'>
                                        <AlertCircle className='mt-0.5 h-4 w-4 shrink-0' />
                                        <p className='min-w-0 flex-1 text-xs whitespace-pre-wrap break-all overflow-x-auto'>
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
                                    <div
                                        hidden
                                        className='flex items-center gap-2 text-slate-400'
                                    >
                                        <Loader2 className='h-4 w-4 animate-spin' />
                                        <span className='text-sm'>
                                            {request.status === 'PENDING'
                                                ? 'Подготовка'
                                                : 'Генерация'}
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
                                                <div
                                                    className={`inline-block w-fit rounded-2xl rounded-tl-sm p-2 ${getResponseBackgroundClass()}`}
                                                >
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
                                                                    loadingEffectForAttachFile();
                                                                    const fileUrl =
                                                                        getMediaFileUrl(
                                                                            file.path
                                                                        );
                                                                    onAttachFile(
                                                                        fileUrl,
                                                                        file.filename
                                                                    );
                                                                }}
                                                                title='Прикрепить к промпту'
                                                            >
                                                                {attachingFile ? (
                                                                    <Loader2 className='h-4 w-4 animate-spin' />
                                                                ) : (
                                                                    <Paperclip className='h-4 w-4' />
                                                                )}
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
                                                    {/* Кнопка увеличения для видео */}
                                                    {file.type === 'VIDEO' && (
                                                        <Button
                                                            type='button'
                                                            size='icon'
                                                            variant='ghost'
                                                            className='h-8 w-8 shrink-0 text-slate-400 opacity-0 transition-opacity hover:text-cyan-400 hover:bg-slate-600/50 group-hover:opacity-100'
                                                            onClick={() =>
                                                                setFullscreenVideo(
                                                                    file
                                                                )
                                                            }
                                                            title='Открыть на весь экран'
                                                        >
                                                            <Maximize2 className='h-4 w-4' />
                                                        </Button>
                                                    )}
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

            {/* Полноэкранный просмотр видео */}
            {fullscreenVideo && (
                <Dialog
                    open={!!fullscreenVideo}
                    onOpenChange={(open) => !open && setFullscreenVideo(null)}
                >
                    <DialogContent
                        showCloseButton={false}
                        className='max-h-[95vh] max-w-[95vw] overflow-hidden border-slate-700 bg-slate-900 p-0'
                    >
                        <DialogTitle className='sr-only'>
                            Просмотр видео: {fullscreenVideo.filename}
                        </DialogTitle>
                        <div className='relative'>
                            <video
                                src={getMediaFileUrl(fullscreenVideo.path)}
                                controls
                                autoPlay
                                muted
                                className='max-h-[90vh] w-full'
                            />
                            <div className='absolute right-2 top-2 flex gap-2'>
                                <Button
                                    size='icon'
                                    variant='secondary'
                                    onClick={() =>
                                        downloadFile(
                                            getMediaFileUrl(
                                                fullscreenVideo.path
                                            ),
                                            fullscreenVideo.filename
                                        )
                                    }
                                >
                                    <Download className='h-4 w-4' />
                                </Button>
                                <Button
                                    size='icon'
                                    variant='secondary'
                                    onClick={() => setFullscreenVideo(null)}
                                >
                                    <X className='h-4 w-4' />
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}

interface StatusBadgeProps {
    status: RequestStatus;
}

function StatusBadge({ status }: StatusBadgeProps) {
    const config = {
        PENDING: {
            icon: Loader2,
            label: 'Подготовка',
            className: 'bg-blue-900/30 text-blue-400',
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
    const shouldSpin = status === 'PROCESSING' || status === 'PENDING';

    return (
        <Badge variant='secondary' className={className}>
            <Icon
                className={`mr-1 h-3 w-3 ${shouldSpin ? 'animate-spin' : ''}`}
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

// Получить отображаемое название провайдера
// Провайдеры: openrouter, gptunnel, laozhang, kieai
function getProviderDisplayName(provider: string): string {
    const providerNames: Record<string, string> = {
        openrouter: 'OpenRouter',
        gptunnel: 'GPTunnel',
        laozhang: 'LaoZhang',
        kieai: 'Kie.ai',
    };
    return providerNames[provider] || provider;
}

// Вспомогательные функции для работы с data URL
function getMimeTypeFromDataUrl(dataUrl: string): string {
    const match = dataUrl.match(/^data:([^;]+)/);
    return match ? match[1] : 'image/png';
}

function isVideoDataUrl(dataUrl: string): boolean {
    const mimeType = getMimeTypeFromDataUrl(dataUrl);
    return mimeType.startsWith('video/');
}
