// Компонент галереи всех медиафайлов чата
import { useState, useMemo, useEffect, useRef } from 'react';
import {
    Trash2,
    Paperclip,
    ChevronDown,
    ImageIcon,
    VideoIcon,
    Loader2,
    Pin,
    RefreshCcw,
    Maximize2,
    Download,
    X,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { MediaPreview } from './media-preview';
import { MediaFullscreenView } from './media-fullscreen-view';
import {
    type MediaFile,
    useDeleteFileMutation,
    useGetFilesQuery,
    useGetChatQuery,
} from '@/redux/media-api';
import {
    PANEL_HEADER_CLASSES,
    PANEL_HEADER_TITLE_CLASSES,
} from '@/lib/panel-styles';
import { getMediaFileUrl } from '@/lib/constants';
import { cn, downloadFile } from '@/lib/utils';
import { calculateTotalChatCost, formatCost } from '@/lib/cost-utils';
import { createLoadingEffectForAttachFile } from '@/lib/media-utils';

interface MediaGalleryProps {
    chatId?: number; // Optional - если не указан, загружаем все файлы
    onAttachFile?: (fileUrl: string, filename: string) => void;
    onRepeatRequest?: (requestId: number) => void;
}

// Количество файлов для первоначального отображения
const INITIAL_FILES_LIMIT = 12;
// Количество файлов для подгрузки при скролле
const LOAD_MORE_COUNT = 12;

export function MediaGallery({
    chatId,
    onAttachFile,
    onRepeatRequest,
}: MediaGalleryProps) {
    const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
    const [deleteFile, { isLoading: isDeleting }] = useDeleteFileMutation();
    const [page, setPage] = useState(1);
    const [accumulatedFiles, setAccumulatedFiles] = useState<MediaFile[]>([]);
    const loadMoreTriggerRef = useRef<HTMLDivElement>(null);
    const [isVideoExpanded, setIsVideoExpanded] = useState(true);
    const [isImageExpanded, setIsImageExpanded] = useState(true);
    const [isPinnedExpanded, setIsPinnedExpanded] = useState(true);
    const [attachingFile, setAttachingFile] = useState(false);
    const [pinnedImageIds, setPinnedImageIds] = useState<Set<number>>(
        new Set()
    );
    // Используем ref для доступа к актуальному значению pinnedImageIds в useEffect
    const pinnedImageIdsRef = useRef<Set<number>>(new Set());

    // Создаем функцию для эффекта загрузки
    const loadingEffectForAttachFile = useMemo(
        () => createLoadingEffectForAttachFile(setAttachingFile),
        []
    );

    // Синхронизируем ref с state
    useEffect(() => {
        pinnedImageIdsRef.current = pinnedImageIds;
    }, [pinnedImageIds]);

    // Загружаем закрепленные изображения из localStorage
    useEffect(() => {
        if (chatId === undefined) return;
        const storageKey = `pinned-images-chat-${chatId}`;
        const stored = localStorage.getItem(storageKey);
        if (stored) {
            try {
                const ids = JSON.parse(stored) as number[];
                const newSet = new Set(ids);
                setPinnedImageIds(newSet);
                pinnedImageIdsRef.current = newSet;
            } catch (error) {
                console.error('Error loading pinned images:', error);
            }
        } else {
            const newSet = new Set<number>();
            setPinnedImageIds(newSet);
            pinnedImageIdsRef.current = newSet;
        }
    }, [chatId]);

    // Сбрасываем страницу и накопленные файлы при смене чата
    useEffect(() => {
        setPage(1);
        setAccumulatedFiles([]);
    }, [chatId]);

    // Загружаем файлы с пагинацией и фильтрацией по chatId
    const {
        data: filesData,
        isLoading,
        isFetching,
    } = useGetFilesQuery(
        {
            page,
            limit: 50, // Загружаем по 50 файлов за раз
            chatId: chatId, // Передаем chatId для фильтрации
        },
        {
            // Пропускаем запрос, если chatId не указан
            skip: chatId === undefined,
        }
    );

    // Загружаем данные чата для расчета стоимости (все запросы)
    const { data: chatData } = useGetChatQuery(
        { id: chatId!, limit: 1000 },
        { skip: chatId === undefined }
    );

    // Расчет суммарной стоимости
    const totalCost = useMemo(() => {
        if (!chatData?.requests) return 0;
        return calculateTotalChatCost(chatData.requests);
    }, [chatData?.requests]);

    // Накопление файлов из всех загруженных страниц
    useEffect(() => {
        // Пропускаем, если нет данных
        if (!filesData?.data) {
            return;
        }

        if (page === 1) {
            // Для первой страницы заменяем все файлы
            // Это гарантирует, что при смене чата мы показываем только файлы нового чата
            setAccumulatedFiles((prev) => {
                const newFilesIds = new Set(filesData.data.map((f) => f.id));
                // Используем ref для получения актуального значения pinnedImageIds
                const currentPinnedIds = pinnedImageIdsRef.current;

                // Сохраняем закрепленные файлы из предыдущего списка
                const preservedPinnedFiles = prev.filter(
                    (f) => currentPinnedIds.has(f.id) && !newFilesIds.has(f.id)
                );

                return [...preservedPinnedFiles, ...filesData.data];
            });
        } else {
            // Для последующих страниц добавляем новые файлы
            setAccumulatedFiles((prev) => {
                const existingIds = new Set(prev.map((f) => f.id));
                const newFiles = filesData.data.filter(
                    (f) => !existingIds.has(f.id)
                );
                return [...prev, ...newFiles];
            });
        }
    }, [filesData, page]);

    // Предзагрузка закрепленных файлов из chatData, если они еще не загружены через пагинацию
    useEffect(() => {
        if (!chatData?.requests || pinnedImageIds.size === 0) return;

        setAccumulatedFiles((prev) => {
            const existingIds = new Set(prev.map((f) => f.id));
            const currentPinnedIds = pinnedImageIdsRef.current;
            const newPinnedFiles: MediaFile[] = [];

            // Извлекаем все файлы из chatData
            chatData.requests.forEach((request) => {
                request.files.forEach((file) => {
                    // Добавляем только закрепленные файлы, которых еще нет в списке
                    if (
                        currentPinnedIds.has(file.id) &&
                        !existingIds.has(file.id)
                    ) {
                        newPinnedFiles.push(file);
                    }
                });
            });

            if (newPinnedFiles.length === 0) return prev;

            // Добавляем закрепленные файлы в начало списка
            return [...newPinnedFiles, ...prev];
        });
    }, [chatData, pinnedImageIds]);

    const allFiles = useMemo(() => accumulatedFiles, [accumulatedFiles]);

    // Функции для работы с закрепленными изображениями
    function togglePinImage(fileId: number) {
        setPinnedImageIds((prev) => {
            const newPinned = new Set(prev);
            if (newPinned.has(fileId)) {
                newPinned.delete(fileId);
            } else {
                newPinned.add(fileId);
            }
            // Сохраняем в localStorage
            if (chatId !== undefined) {
                const storageKey = `pinned-images-chat-${chatId}`;
                localStorage.setItem(
                    storageKey,
                    JSON.stringify(Array.from(newPinned))
                );
            }
            return newPinned;
        });
    }

    // Разделяем файлы на видео и изображения, и на закрепленные/незакрепленные
    const { videoFiles, pinnedImages, unpinnedImages } = useMemo(() => {
        const videos: MediaFile[] = [];
        const pinned: MediaFile[] = [];
        const unpinned: MediaFile[] = [];

        allFiles.forEach((file) => {
            if (file.type === 'VIDEO') {
                videos.push(file);
            } else if (file.type === 'IMAGE') {
                if (pinnedImageIds.has(file.id)) {
                    pinned.push(file);
                } else {
                    unpinned.push(file);
                }
            }
        });

        return {
            videoFiles: videos,
            pinnedImages: pinned,
            unpinnedImages: unpinned,
        };
    }, [allFiles, pinnedImageIds]);

    // Отображаемые файлы
    const visibleVideoFiles = useMemo(() => videoFiles, [videoFiles]);
    const visiblePinnedImages = useMemo(() => pinnedImages, [pinnedImages]);
    const visibleUnpinnedImages = useMemo(
        () => unpinnedImages,
        [unpinnedImages]
    );

    // Автоматическая подгрузка следующей страницы при скролле
    useEffect(() => {
        if (!loadMoreTriggerRef.current || isFetching) {
            return;
        }

        // Проверяем, есть ли еще страницы для загрузки
        const hasMorePages =
            filesData?.pagination &&
            filesData.pagination.page < filesData.pagination.totalPages;

        if (!hasMorePages) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    setPage((prev) => prev + 1);
                }
            },
            { threshold: 0.1 }
        );

        observer.observe(loadMoreTriggerRef.current);

        return () => {
            observer.disconnect();
        };
    }, [isFetching, filesData]);

    function handleFileClick(file: MediaFile) {
        setSelectedFile(file);
    }

    async function handleDeleteFile(event: React.MouseEvent, fileId: number) {
        event.stopPropagation();
        // Оптимистичное обновление - удаляем файл из локального состояния сразу
        setAccumulatedFiles((prev) => prev.filter((f) => f.id !== fileId));
        try {
            await deleteFile(fileId).unwrap();
        } catch (error) {
            console.error('Ошибка удаления файла:', error);
            // В случае ошибки файл будет восстановлен при следующем обновлении данных
        }
    }

    // Показываем скелетоны во время загрузки
    if (isLoading) {
        return (
            <div className='flex h-full w-[30%] flex-col border-l border-border bg-background'>
                <div className={PANEL_HEADER_CLASSES}>
                    <h2 className={PANEL_HEADER_TITLE_CLASSES}>Медиафайлы</h2>
                </div>
                <ScrollArea className='flex-1'>
                    <div className='grid grid-cols-3 gap-2 p-4'>
                        {Array.from({ length: INITIAL_FILES_LIMIT }).map(
                            (_, index) => (
                                <Skeleton
                                    key={`skeleton-${index}`}
                                    className='aspect-square w-full rounded-xl'
                                />
                            )
                        )}
                    </div>
                </ScrollArea>
            </div>
        );
    }

    if (allFiles.length === 0) {
        return (
            <div className='flex h-full w-[30%] flex-col border-l border-border bg-background'>
                <div className={PANEL_HEADER_CLASSES}>
                    <h2 className={PANEL_HEADER_TITLE_CLASSES}>Медиафайлы</h2>
                </div>
                <div className='flex flex-1 items-center justify-center'>
                    <p className='text-sm text-muted-foreground'>Нет медиафайлов</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className='flex h-full w-[30%] flex-col border-l border-border bg-background'>
                {/* Заголовок */}
                <div
                    className={cn(
                        PANEL_HEADER_CLASSES,
                        'flex-row items-center justify-between bg-background'
                    )}
                >
                    <h2 className={PANEL_HEADER_TITLE_CLASSES}>
                        Медиафайлы ({allFiles.length})
                    </h2>
                    {totalCost > 0 && (
                        <div className='text-[10px] font-medium px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20'>
                            {formatCost(totalCost)}
                        </div>
                    )}
                </div>

                {/* Grid с файлами */}
                <ScrollArea className='flex-1'>
                    <div className='p-4 space-y-4'>
                        {/* Секция закрепленных изображений */}
                        {pinnedImages.length > 0 && (
                            <div>
                                <button
                                    onClick={() =>
                                        setIsPinnedExpanded(!isPinnedExpanded)
                                    }
                                    className='flex w-full items-center justify-between rounded-lg bg-transparent px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors'
                                >
                                    <div className='flex gap-2 items-center'>
                                        <Pin className='h-4 w-4 text-yellow-400' />
                                        <span>
                                            Закрепленные ({pinnedImages.length})
                                        </span>
                                    </div>
                                    <ChevronDown
                                        className={`h-4 w-4 transition-transform ${
                                            isPinnedExpanded ? 'rotate-180' : ''
                                        }`}
                                    />
                                </button>
                                {isPinnedExpanded && (
                                    <div className='grid grid-cols-3 gap-2 mt-2'>
                                        {visiblePinnedImages.map((file) => (
                                            <div
                                                key={file.id}
                                                className='group relative cursor-pointer transition-transform hover:scale-105'
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleFileClick(file);
                                                }}
                                                role='button'
                                                tabIndex={0}
                                                onKeyDown={(e) => {
                                                    if (
                                                        e.key === 'Enter' ||
                                                        e.key === ' '
                                                    ) {
                                                        e.preventDefault();
                                                        handleFileClick(file);
                                                    }
                                                }}
                                            >
                                                <div
                                                    onClick={(e) =>
                                                        e.stopPropagation()
                                                    }
                                                >
                                                    <MediaPreview
                                                        file={file}
                                                        className='h-full w-full'
                                                    />
                                                </div>
                                                {/* Кнопка прикрепления слева вверху */}
                                                {onAttachFile && (
                                                    <Button
                                                        size='icon'
                                                        variant='ghost'
                                                        className='absolute left-1 top-1 h-6 w-6 text-slate-400 opacity-0 transition-opacity hover:text-cyan-400 hover:bg-cyan-600/20 group-hover:opacity-100'
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (!file.path)
                                                                return;
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
                                                            <Loader2 className='h-3.5 w-3.5 animate-spin' />
                                                        ) : (
                                                            <Paperclip className='h-3.5 w-3.5' />
                                                        )}
                                                    </Button>
                                                )}
                                                {/* Кнопка повторить запрос */}
                                                {onRepeatRequest && (
                                                    <Button
                                                        size='icon'
                                                        variant='ghost'
                                                        className='absolute left-8 top-1 h-6 w-6 text-slate-400 opacity-0 transition-opacity hover:text-cyan-400 hover:bg-cyan-600/20 focus:text-cyan-400 focus:bg-cyan-600/20 group-hover:opacity-100'
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onRepeatRequest(
                                                                file.requestId
                                                            );
                                                        }}
                                                        title='Повторить запрос'
                                                    >
                                                        <RefreshCcw className='h-3.5 w-3.5' />
                                                    </Button>
                                                )}
                                                {/* Кнопка закрепления */}
                                                <Button
                                                    size='icon'
                                                    variant='ghost'
                                                    className='absolute right-7 top-1 h-6 w-6 text-yellow-400 opacity-0 transition-opacity hover:text-yellow-300 hover:bg-yellow-600/20 group-hover:opacity-100'
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        togglePinImage(file.id);
                                                    }}
                                                    title='Открепить'
                                                >
                                                    <Pin className='h-3.5 w-3.5 fill-current' />
                                                </Button>
                                                {/* Кнопка удаления справа вверху */}
                                                <Button
                                                    size='icon'
                                                    variant='ghost'
                                                    className='absolute right-1 top-1 h-6 w-6 text-slate-400 opacity-0 transition-opacity hover:text-red-400 hover:bg-red-600/20 group-hover:opacity-100'
                                                    onClick={(e) =>
                                                        handleDeleteFile(
                                                            e,
                                                            file.id
                                                        )
                                                    }
                                                    disabled={isDeleting}
                                                    title='Удалить файл'
                                                >
                                                    <Trash2 className='h-3.5 w-3.5' />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Секция изображений */}
                        {unpinnedImages.length > 0 && (
                            <div>
                                <button
                                    onClick={() =>
                                        setIsImageExpanded(!isImageExpanded)
                                    }
                                    className='flex w-full items-center justify-between rounded-lg bg-slate-700/0 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 transition-colors'
                                >
                                    <div className='flex gap-2 items-center'>
                                        <ImageIcon className='h-4 w-4' />
                                        <span>
                                            Изображения ({unpinnedImages.length}
                                            )
                                        </span>
                                    </div>
                                    <ChevronDown
                                        className={`h-4 w-4 transition-transform ${
                                            isImageExpanded ? 'rotate-180' : ''
                                        }`}
                                    />
                                </button>
                                {isImageExpanded && (
                                    <div className='grid grid-cols-3 gap-2 mt-2'>
                                        {visibleUnpinnedImages.map((file) => (
                                            <div
                                                key={file.id}
                                                className='group relative cursor-pointer transition-transform hover:scale-105'
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleFileClick(file);
                                                }}
                                                role='button'
                                                tabIndex={0}
                                                onKeyDown={(e) => {
                                                    if (
                                                        e.key === 'Enter' ||
                                                        e.key === ' '
                                                    ) {
                                                        e.preventDefault();
                                                        handleFileClick(file);
                                                    }
                                                }}
                                            >
                                                <div
                                                    onClick={(e) =>
                                                        e.stopPropagation()
                                                    }
                                                >
                                                    <MediaPreview
                                                        file={file}
                                                        className='h-full w-full'
                                                    />
                                                </div>
                                                {/* Кнопка прикрепления слева вверху (только для изображений) */}
                                                {onAttachFile && (
                                                    <Button
                                                        size='icon'
                                                        variant='ghost'
                                                        className='absolute left-1 top-1 h-6 w-6 text-slate-400 opacity-0 transition-opacity hover:text-cyan-400 hover:bg-cyan-600/20 group-hover:opacity-100'
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (!file.path)
                                                                return;
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
                                                            <Loader2 className='h-3.5 w-3.5 animate-spin' />
                                                        ) : (
                                                            <Paperclip className='h-3.5 w-3.5' />
                                                        )}
                                                    </Button>
                                                )}
                                                {/* Кнопка повторить запрос */}
                                                {onRepeatRequest && (
                                                    <Button
                                                        size='icon'
                                                        variant='ghost'
                                                        className='absolute left-8 top-1 h-6 w-6 text-slate-400 opacity-0 transition-opacity hover:text-cyan-400 hover:bg-cyan-600/20 focus:text-cyan-400 focus:bg-cyan-600/20 group-hover:opacity-100'
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onRepeatRequest(
                                                                file.requestId
                                                            );
                                                        }}
                                                        title='Повторить запрос'
                                                    >
                                                        <RefreshCcw className='h-3.5 w-3.5' />
                                                    </Button>
                                                )}
                                                {/* Кнопка закрепления */}
                                                <Button
                                                    size='icon'
                                                    variant='ghost'
                                                    className='absolute right-7 top-1 h-6 w-6 text-slate-400 opacity-0 transition-opacity hover:text-yellow-400 hover:bg-yellow-600/20 group-hover:opacity-100'
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        togglePinImage(file.id);
                                                    }}
                                                    title='Закрепить'
                                                >
                                                    <Pin className='h-3.5 w-3.5' />
                                                </Button>
                                                {/* Кнопка удаления справа вверху */}
                                                <Button
                                                    size='icon'
                                                    variant='ghost'
                                                    className='absolute right-1 top-1 h-6 w-6 text-slate-400 opacity-0 transition-opacity hover:text-red-400 hover:bg-red-600/20 group-hover:opacity-100'
                                                    onClick={(e) =>
                                                        handleDeleteFile(
                                                            e,
                                                            file.id
                                                        )
                                                    }
                                                    disabled={isDeleting}
                                                    title='Удалить файл'
                                                >
                                                    <Trash2 className='h-3.5 w-3.5' />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Секция видео */}
                        {videoFiles.length > 0 && (
                            <div>
                                <button
                                    onClick={() =>
                                        setIsVideoExpanded(!isVideoExpanded)
                                    }
                                    className='flex w-full items-center justify-between rounded-lg bg-slate-700/0 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 transition-colors'
                                >
                                    <div className='flex gap-2 items-center'>
                                        <VideoIcon className='h-4 w-4' />
                                        <span>Видео ({videoFiles.length})</span>
                                    </div>

                                    <ChevronDown
                                        className={`h-4 w-4 transition-transform ${
                                            isVideoExpanded ? 'rotate-180' : ''
                                        }`}
                                    />
                                </button>
                                {isVideoExpanded && (
                                    <div className='grid grid-cols-3 gap-2 mt-2'>
                                        {visibleVideoFiles.map((file) => (
                                            <div
                                                key={file.id}
                                                className='group relative cursor-pointer transition-transform hover:scale-105'
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleFileClick(file);
                                                }}
                                                role='button'
                                                tabIndex={0}
                                                onKeyDown={(e) => {
                                                    if (
                                                        e.key === 'Enter' ||
                                                        e.key === ' '
                                                    ) {
                                                        e.preventDefault();
                                                        handleFileClick(file);
                                                    }
                                                }}
                                            >
                                                <div
                                                    onClick={(e) =>
                                                        e.stopPropagation()
                                                    }
                                                >
                                                    <MediaPreview
                                                        file={file}
                                                        className='h-full w-full'
                                                    />
                                                </div>
                                                {/* Кнопка прикрепления слева вверху (только для изображений) */}
                                                {onAttachFile && (
                                                    <Button
                                                        size='icon'
                                                        variant='ghost'
                                                        className='absolute left-1 top-1 h-6 w-6 text-slate-400 opacity-0 transition-opacity hover:text-cyan-400 hover:bg-cyan-600/20 group-hover:opacity-100'
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (!file.path)
                                                                return;
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
                                                        <Paperclip className='h-3.5 w-3.5' />
                                                    </Button>
                                                )}
                                                {/* Кнопка разворачивания видео */}
                                                <Button
                                                    size='icon'
                                                    variant='ghost'
                                                    className='absolute left-1 top-8 h-6 w-6 text-slate-400 opacity-0 transition-opacity hover:text-blue-400 hover:bg-blue-600/20 group-hover:opacity-100'
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleFileClick(file);
                                                    }}
                                                    title='Развернуть видео'
                                                >
                                                    <Maximize2 className='h-3.5 w-3.5' />
                                                </Button>
                                                {/* Кнопка повторить запрос */}
                                                {onRepeatRequest && (
                                                    <Button
                                                        size='icon'
                                                        variant='ghost'
                                                        className='absolute left-8 top-1 h-6 w-6 text-slate-400 opacity-0 transition-opacity hover:text-cyan-400 hover:bg-cyan-600/20 focus:text-cyan-400 focus:bg-cyan-600/20 group-hover:opacity-100'
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onRepeatRequest(
                                                                file.requestId
                                                            );
                                                        }}
                                                        title='Повторить запрос'
                                                    >
                                                        <RefreshCcw className='h-3.5 w-3.5' />
                                                    </Button>
                                                )}
                                                {/* Кнопка удаления справа вверху */}
                                                <Button
                                                    size='icon'
                                                    variant='ghost'
                                                    className='absolute right-1 top-1 h-6 w-6 text-slate-400 opacity-0 transition-opacity hover:text-red-400 hover:bg-red-600/20 group-hover:opacity-100'
                                                    onClick={(e) =>
                                                        handleDeleteFile(
                                                            e,
                                                            file.id
                                                        )
                                                    }
                                                    disabled={isDeleting}
                                                    title='Удалить файл'
                                                >
                                                    <Trash2 className='h-3.5 w-3.5' />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Триггер для lazy loading следующей страницы */}
                        {filesData?.pagination &&
                            filesData.pagination.page <
                                filesData.pagination.totalPages && (
                                <div
                                    ref={loadMoreTriggerRef}
                                    className='flex h-20 items-center justify-center'
                                >
                                    {isFetching ? (
                                        <div className='text-xs text-slate-400'>
                                            Загрузка...
                                        </div>
                                    ) : (
                                        <div className='h-1 w-1 rounded-full bg-slate-600' />
                                    )}
                                </div>
                            )}
                    </div>
                </ScrollArea>
            </div>

            {/* Полноэкранный просмотр */}
            {selectedFile && (
                <>
                    {/* Для видео используем Dialog как в message-item */}
                    {selectedFile.type === 'VIDEO' && selectedFile.path && (
                        <Dialog
                            open={!!selectedFile}
                            onOpenChange={(open) =>
                                !open && setSelectedFile(null)
                            }
                        >
                            <DialogContent
                                showCloseButton={false}
                                className='max-h-[95vh] max-w-[95vw] overflow-hidden border-border bg-background p-0'
                            >
                                <DialogTitle className='sr-only'>
                                    Просмотр видео: {selectedFile.filename}
                                </DialogTitle>
                                <div className='relative'>
                                    <video
                                        src={getMediaFileUrl(selectedFile.path)}
                                        controls
                                        autoPlay
                                        className='max-h-[90vh] w-full'
                                    />
                                    <div className='absolute right-2 top-2 flex gap-2'>
                                        {onRepeatRequest && (
                                            <Button
                                                size='icon'
                                                variant='secondary'
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onRepeatRequest(
                                                        selectedFile.requestId
                                                    );
                                                }}
                                                className='h-9 w-9 text-slate-400 hover:text-cyan-400 focus:text-cyan-400'
                                                title='Повторить запрос'
                                            >
                                                <RefreshCcw className='h-4 w-4' />
                                            </Button>
                                        )}
                                        <Button
                                            size='icon'
                                            variant='secondary'
                                            onClick={() => {
                                                if (!selectedFile.path) return;
                                                downloadFile(
                                                    getMediaFileUrl(
                                                        selectedFile.path
                                                    ),
                                                    selectedFile.filename
                                                );
                                            }}
                                            title='Скачать файл'
                                        >
                                            <Download className='h-4 w-4' />
                                        </Button>
                                        <Button
                                            size='icon'
                                            variant='secondary'
                                            onClick={() =>
                                                setSelectedFile(null)
                                            }
                                        >
                                            <X className='h-4 w-4' />
                                        </Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}
                    {/* Для изображений используем MediaFullscreenView */}
                    {selectedFile.type !== 'VIDEO' && (
                        <MediaFullscreenView
                            file={selectedFile}
                            onClose={() => setSelectedFile(null)}
                            onAttachFile={onAttachFile}
                            onRepeatRequest={onRepeatRequest}
                            isPinned={pinnedImageIds.has(selectedFile.id)}
                            onTogglePin={() => togglePinImage(selectedFile.id)}
                        />
                    )}
                </>
            )}
        </>
    );
}
