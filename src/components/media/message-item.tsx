// Компонент элемента сообщения (запроса и результата)
import { useState, useRef, useEffect, useMemo } from 'react';
import {
    AlertCircle,
    Paperclip,
    Trash2,
    Maximize2,
    Download,
    X,
    Loader2,
    RefreshCcw,
    Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { MediaPreview } from './media-preview';
import { StatusBadge } from './status-badge';
import {
    type MediaRequest,
    type MediaModel,
    type MediaFile,
    useDeleteFileMutation,
    useGetModelsQuery,
} from '@/redux/media-api';
import { getMediaFileUrl } from '@/lib/constants';
import { downloadFile, getOriginalFileUrl } from '@/lib/utils';
import {
    createLoadingEffectForAttachFile,
    formatTime,
    getProviderDisplayName,
    isVideoDataUrl,
    toDirectImageUrl,
} from '@/lib/media-utils';
import { ImageIcon } from 'lucide-react';

interface AttachedFileThumbnailProps {
    urls: string[];
    alt: string;
    isVideo: boolean;
}

function AttachedFileThumbnail({ urls, alt, isVideo }: AttachedFileThumbnailProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [hasError, setHasError] = useState(false);
    const currentUrl = urls[currentIndex];

    function handleError() {
        if (currentIndex + 1 < urls.length) {
            setCurrentIndex((i) => i + 1);
            setHasError(false);
        } else {
            setHasError(true);
        }
    }

    if (hasError || !currentUrl) {
        return (
            <div className='flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-primary-foreground/20 bg-secondary'>
                <ImageIcon className='h-8 w-8 text-muted-foreground/50' />
            </div>
        );
    }

    return (
        <div className='h-16 w-16 overflow-hidden rounded-lg border border-primary-foreground/20'>
            {isVideo ? (
                <video
                    src={currentUrl}
                    className='h-full w-full object-cover'
                    onError={handleError}
                />
            ) : (
                <img
                    src={currentUrl}
                    alt={alt}
                    className='h-full w-full object-cover'
                    referrerPolicy='no-referrer'
                    onError={handleError}
                />
            )}
        </div>
    );
}

interface MessageItemProps {
    request: MediaRequest;
    onEditPrompt?: (prompt: string) => void;
    onAttachFile?: (
        fileUrl: string,
        filename: string,
        imgbbUrl?: string,
    ) => void;
    onRepeatRequest?: (request: MediaRequest, model?: MediaModel) => void;
}

export function MessageItem({
    request,
    onEditPrompt,
    onAttachFile,
    onRepeatRequest,
}: MessageItemProps) {
    const [deleteFile, { isLoading: isDeleting }] = useDeleteFileMutation();
    const { data: models } = useGetModelsQuery();
    const [fullscreenVideo, setFullscreenVideo] = useState<MediaFile | null>(
        null,
    );
    const [attachingFile, setAttachingFile] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isClamped, setIsClamped] = useState(false);
    const textRef = useRef<HTMLParagraphElement>(null);

    // Создаем функцию для эффекта загрузки
    const loadingEffectForAttachFile = useMemo(
        () => createLoadingEffectForAttachFile(setAttachingFile),
        [],
    );

    // Проверяем, переполнен ли текст (превышает 2 строки)
    useEffect(() => {
        if (textRef.current) {
            const { scrollHeight, clientHeight } = textRef.current;
            setIsClamped(scrollHeight > clientHeight);
        }
    }, [request.prompt]);

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

    // Определение класса фона для ответа нейросети
    function getResponseBackgroundClass(): string {
        if (request.status === 'FAILED') {
            return 'bg-destructive/10 border border-destructive/20';
        }
        return 'bg-secondary/40 border border-border/50';
    }

    return (
        <div className='space-y-3'>
            {/* Промпт пользователя */}
            <div className='group flex items-start justify-end gap-2'>
                {/* Кнопки действий слева от сообщения */}
                <div className='flex flex-col gap-1'>
                    {/* Кнопка редактирования */}
                    {onEditPrompt && (
                        <Button
                            type='button'
                            size='icon'
                            variant='ghost'
                            className='h-8 w-8 shrink-0 text-primary opacity-0 transition-opacity hover:text-primary/80 hover:bg-primary/20 group-hover:opacity-100'
                            onClick={() => onEditPrompt(request.prompt)}
                            title='Редактировать промпт'
                        >
                            <Copy className='text-muted-foreground' />
                            {/* <span className='text-lg'>✨</span> */}
                        </Button>
                    )}
                    {/* Кнопка повторить запрос */}
                    {onRepeatRequest && (
                        <Button
                            type='button'
                            size='icon'
                            variant='ghost'
                            className='h-8 w-8 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-primary hover:bg-primary/20 focus:text-primary focus:bg-primary/20 group-hover:opacity-100'
                            onClick={() => onRepeatRequest(request)}
                            title='Повторить запрос к нейронке'
                        >
                            <RefreshCcw className='h-4 w-4' />
                        </Button>
                    )}
                </div>
                <div className='max-w-[80%] rounded-2xl rounded-tr-sm bg-primary px-4 py-3 shadow-sm'>
                    <div className='relative'>
                        <p
                            ref={textRef}
                            className={`whitespace-pre-wrap text-sm text-primary-foreground transition-all duration-200 ${
                                !isExpanded ? 'line-clamp-2' : ''
                            }`}
                        >
                            {request.prompt}
                        </p>
                        {isClamped && (
                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className='mt-1 text-xs font-medium text-primary-foreground/80 hover:text-primary-foreground transition-colors'
                            >
                                {isExpanded ? 'Свернуть' : 'Показать полностью'}
                            </button>
                        )}
                    </div>
                    {/* Превью прикрепленных файлов */}
                    {((request.inputFiles && request.inputFiles.length > 0) ||
                        (request.files &&
                            request.files.length > 0 &&
                            (!request.inputFiles ||
                                request.inputFiles.length === 0))) && (
                        <div className='mt-2 flex flex-wrap gap-2'>
                            {/* Сначала показываем inputFiles, если есть */}
                            {request.inputFiles?.map((fileUrl, index) => {
                                if (!fileUrl) return null;

                                const isDataUrl = fileUrl.startsWith('data:');
                                const isHttpUrl =
                                    fileUrl.startsWith('http://') ||
                                    fileUrl.startsWith('https://');

                                // Приоритет: data URL → локальный path (быстрее) → ссылки (imgbb)
                                const fallbackFile = request.files?.[index];
                                const localUrls: string[] = [];
                                const externalUrls: string[] = [];
                                if (fallbackFile) {
                                    if (fallbackFile.path) localUrls.push(getMediaFileUrl(fallbackFile.path));
                                    if (fallbackFile.previewPath) localUrls.push(getMediaFileUrl(fallbackFile.previewPath));
                                    if (fallbackFile.url) externalUrls.push(toDirectImageUrl(fallbackFile.url));
                                }
                                if (isDataUrl) {
                                    localUrls.unshift(fileUrl);
                                } else if (!isHttpUrl && fileUrl) {
                                    const localUrl = getMediaFileUrl(fileUrl);
                                    if (!localUrls.includes(localUrl)) localUrls.unshift(localUrl);
                                } else if (isHttpUrl) {
                                    externalUrls.push(toDirectImageUrl(fileUrl));
                                } else {
                                    return null;
                                }
                                const allUrls = [...new Set([...localUrls, ...externalUrls])];

                                const isVideo = isDataUrl
                                    ? isVideoDataUrl(fileUrl)
                                    : fileUrl.match(/\.(mp4|webm|mov)$/i) !== null;

                                return (
                                    <AttachedFileThumbnail
                                        key={index}
                                        urls={allUrls}
                                        alt={`Прикрепленный файл ${index + 1}`}
                                        isVideo={isVideo}
                                    />
                                );
                            })}
                            {/* Fallback: показываем файлы из request.files, если inputFiles пустое */}
                            {(!request.inputFiles ||
                                request.inputFiles.length === 0) &&
                                request.files.map((file) => {
                                    // Приоритет: локальный path → ссылки
                                    const urls: string[] = [];
                                    if (file.path) urls.push(getMediaFileUrl(file.path));
                                    if (file.previewPath) urls.push(getMediaFileUrl(file.previewPath));
                                    if (file.url) urls.push(toDirectImageUrl(file.url));
                                    const uniqueUrls = urls.filter((u, i, a) => a.indexOf(u) === i);
                                    if (uniqueUrls.length === 0) return null;

                                    return (
                                        <AttachedFileThumbnail
                                            key={file.id}
                                            urls={uniqueUrls}
                                            alt={file.filename}
                                            isVideo={file.type === 'VIDEO'}
                                        />
                                    );
                                })}
                        </div>
                    )}
                    <div className='mt-1 flex items-center justify-end gap-2 text-xs text-primary-foreground/70'>
                        {modelInfo && (
                            <span className='flex items-center gap-1'>
                                {modelInfo.name}
                                {providerName && (
                                    <span className='text-primary-foreground/50'>
                                        • {providerName}
                                    </span>
                                )}
                                {request.seed && (
                                    <span className='text-primary-foreground/50'>
                                        • Seed: {request.seed}
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
                                    <div className='mt-2 flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-destructive'>
                                        <AlertCircle className='mt-0.5 h-4 w-4 shrink-0' />
                                        <p className='min-w-0 flex-1 text-xs whitespace-pre-wrap break-all overflow-x-auto'>
                                            {request.errorMessage}
                                        </p>
                                    </div>
                                )}

                            {/* Загрузка с скелетоном */}
                            {(request.status === 'PENDING' ||
                                request.status === 'PROCESSING' ||
                                request.status === 'COMPLETING') && (
                                <div className='mt-3 space-y-3'>
                                    {/* Скелетон-placeholder для изображения */}
                                    <Skeleton className='aspect-square w-48 rounded-xl' />
                                </div>
                            )}

                            {/* Сообщение об отсутствии файлов */}
                            {request.status === 'COMPLETED' &&
                                request.files.length === 0 && (
                                    <div className='mt-2 rounded-lg bg-primary/10 p-3 text-primary'>
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
                                                                className='h-8 w-8 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-primary hover:bg-primary/10 group-hover:opacity-100'
                                                                onClick={() => {
                                                                    // Используем path если есть, иначе url (для файлов на imgbb)
                                                                    const fileUrl =
                                                                        file.path
                                                                            ? getMediaFileUrl(
                                                                                  file.path,
                                                                              )
                                                                            : file.url;
                                                                    if (
                                                                        !fileUrl
                                                                    ) {
                                                                        console.warn(
                                                                            '[MessageItem] Нет file.path и file.url',
                                                                        );
                                                                        alert(
                                                                            'Ошибка: у файла отсутствует путь или URL. Невозможно прикрепить файл.',
                                                                        );
                                                                        return;
                                                                    }
                                                                    loadingEffectForAttachFile();
                                                                    // Передаем file.url как imgbbUrl для изображений, чтобы не загружать на imgbb повторно
                                                                    onAttachFile(
                                                                        fileUrl,
                                                                        file.filename,
                                                                        file.url ||
                                                                            undefined,
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
                                                                file.id,
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
                                                            className='h-8 w-8 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-primary hover:bg-primary/10 group-hover:opacity-100'
                                                            onClick={() =>
                                                                setFullscreenVideo(
                                                                    file,
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
                        className='max-h-[95vh] max-w-[95vw] overflow-hidden border-border bg-background p-0'
                    >
                        <DialogTitle className='sr-only'>
                            Просмотр видео: {fullscreenVideo.filename}
                        </DialogTitle>
                        <div className='relative'>
                            <video
                                src={getOriginalFileUrl(fullscreenVideo) || ''}
                                controls
                                autoPlay
                                className='max-h-[90vh] w-full'
                            />
                            <div className='absolute right-2 top-2 flex gap-2'>
                                <Button
                                    size='icon'
                                    variant='secondary'
                                    onClick={() => {
                                        const downloadUrl =
                                            getOriginalFileUrl(fullscreenVideo);
                                        if (!downloadUrl) {
                                            console.warn(
                                                '[MessageItem] Невозможно скачать файл: нет оригинального URL',
                                                fullscreenVideo,
                                            );
                                            return;
                                        }
                                        downloadFile(
                                            downloadUrl,
                                            fullscreenVideo.filename,
                                        );
                                    }}
                                    title='Скачать файл'
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
