// Компонент галереи всех медиафайлов чата
import { useState, useMemo, useEffect, useRef } from 'react';
import {
    Download,
    X,
    Trash2,
    Paperclip,
    ChevronDown,
    ImageIcon,
    VideoIcon,
    Loader2,
    Pin,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MediaPreview } from './media-preview';
import {
    type MediaFile,
    useDeleteFileMutation,
    useGetFilesQuery,
} from '@/redux/media-api';
import {
    PANEL_HEADER_CLASSES,
    PANEL_HEADER_TITLE_CLASSES,
} from '@/lib/panel-styles';
import { getMediaFileUrl } from '@/lib/constants';
import { formatFileSize, downloadFile } from '@/lib/utils';

interface MediaGalleryProps {
    chatId?: number; // Optional - если не указан, загружаем все файлы
    onAttachFile?: (fileUrl: string, filename: string) => void;
}

// Количество файлов для первоначального отображения
const INITIAL_FILES_LIMIT = 12;
// Количество файлов для подгрузки при скролле
const LOAD_MORE_COUNT = 12;

export function MediaGallery({ chatId, onAttachFile }: MediaGalleryProps) {
    const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
    const [deleteFile, { isLoading: isDeleting }] = useDeleteFileMutation();
    const [page, setPage] = useState(1);
    const [accumulatedFiles, setAccumulatedFiles] = useState<MediaFile[]>([]);
    const loadMoreTriggerRef = useRef<HTMLDivElement>(null);
    const [isVideoExpanded, setIsVideoExpanded] = useState(true);
    const [isImageExpanded, setIsImageExpanded] = useState(true);
    const [isPinnedExpanded, setIsPinnedExpanded] = useState(true);
    const [attachingFile, setAttachingFile] = useState(false);
    const [pinnedImageIds, setPinnedImageIds] = useState<Set<number>>(new Set());

    // Загружаем закрепленные изображения из localStorage
    useEffect(() => {
        if (chatId === undefined) return;
        const storageKey = `pinned-images-chat-${chatId}`;
        const stored = localStorage.getItem(storageKey);
        if (stored) {
            try {
                const ids = JSON.parse(stored) as number[];
                setPinnedImageIds(new Set(ids));
            } catch (error) {
                console.error('Error loading pinned images:', error);
            }
        } else {
            setPinnedImageIds(new Set());
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

    // Накопление файлов из всех загруженных страниц
    useEffect(() => {
        // Пропускаем, если нет данных
        if (!filesData?.data) {
            return;
        }

        if (page === 1) {
            // Для первой страницы заменяем все файлы
            // Это гарантирует, что при смене чата мы показываем только файлы нового чата
            setAccumulatedFiles(filesData.data);
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

        return { videoFiles: videos, pinnedImages: pinned, unpinnedImages: unpinned };
    }, [allFiles, pinnedImageIds]);

    // Отображаемые файлы
    const visibleVideoFiles = useMemo(() => videoFiles, [videoFiles]);
    const visiblePinnedImages = useMemo(() => pinnedImages, [pinnedImages]);
    const visibleUnpinnedImages = useMemo(() => unpinnedImages, [unpinnedImages]);

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

    function loadingEffectForAttachFile() {
        setAttachingFile(true);
        setTimeout(() => {
            setAttachingFile(false);
        }, 1500);
    }

    // Показываем скелетоны во время загрузки
    if (isLoading) {
        return (
            <div className='flex h-full w-[30%] flex-col border-l border-slate-700 bg-slate-800/50'>
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
            <div className='flex h-full w-[30%] flex-col border-l border-slate-700 bg-slate-800/50'>
                <div className={PANEL_HEADER_CLASSES}>
                    <h2 className={PANEL_HEADER_TITLE_CLASSES}>Медиафайлы</h2>
                </div>
                <div className='flex flex-1 items-center justify-center'>
                    <p className='text-sm text-slate-400'>Нет медиафайлов</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className='flex h-full w-[30%] flex-col border-l border-slate-700 bg-slate-800/50'>
                {/* Заголовок */}
                <div className={PANEL_HEADER_CLASSES}>
                    <h2 className={PANEL_HEADER_TITLE_CLASSES}>
                        Медиафайлы ({allFiles.length})
                    </h2>
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
                                    className='flex w-full items-center justify-between rounded-lg bg-slate-700/0 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 transition-colors'
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
                                            Изображения ({unpinnedImages.length})
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
                <MediaFullscreenView
                    file={selectedFile}
                    onClose={() => setSelectedFile(null)}
                    onAttachFile={onAttachFile}
                    isPinned={pinnedImageIds.has(selectedFile.id)}
                    onTogglePin={() => togglePinImage(selectedFile.id)}
                />
            )}
        </>
    );
}

interface MediaFullscreenViewProps {
    file: MediaFile;
    onClose: () => void;
    onAttachFile?: (fileUrl: string, filename: string) => void;
    isPinned?: boolean;
    onTogglePin?: () => void;
}

function MediaFullscreenView({
    file,
    onClose,
    onAttachFile,
    isPinned = false,
    onTogglePin,
}: MediaFullscreenViewProps) {
    if (!file.path) return null;
    const fileUrl = getMediaFileUrl(file.path);
    // Поддержка base64 превью из оптимистичного обновления
    const previewUrl = file.previewPath
        ? file.previewPath.startsWith('data:') ||
          file.previewPath.startsWith('__pending__')
            ? file.previewPath.replace('__pending__', '')
            : getMediaFileUrl(file.previewPath)
        : undefined;

    // Обработка клавиши Escape для закрытия
    useEffect(() => {
        function handleEscape(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                onClose();
            }
        }

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    function handleDownload() {
        downloadFile(fileUrl, file.filename);
    }

    return (
        <div
            className='fixed inset-0 z-50 flex items-center justify-center bg-black/90'
            onClick={onClose}
        >
            <div
                className='relative max-h-[95vh] max-w-[95vw]'
                onClick={(e) => e.stopPropagation()}
            >
                {file.type === 'IMAGE' && (
                    <img
                        src={fileUrl}
                        alt={file.filename}
                        className='max-h-[90vh] max-w-[90vw] object-contain'
                    />
                )}

                {file.type === 'VIDEO' && (
                    <video
                        src={fileUrl}
                        poster={previewUrl}
                        controls
                        // autoPlay
                        muted
                        className='max-h-[90vh] max-w-[90vw]'
                    />
                )}

                {file.type === 'AUDIO' && (
                    <div className='flex flex-col items-center gap-4 rounded-lg bg-slate-800 p-8'>
                        <audio src={fileUrl} controls />
                        <p className='text-white'>{file.filename}</p>
                    </div>
                )}

                {/* Кнопки действий */}
                <div className='absolute right-2 top-2 flex gap-2'>
                    {/* Кнопка прикрепления (только для изображений) */}
                    {file.type === 'IMAGE' && onAttachFile && (
                        <Button
                            size='icon'
                            variant='secondary'
                            onClick={(e) => {
                                e.stopPropagation();
                                onAttachFile(fileUrl, file.filename);
                            }}
                            className='h-8 w-8'
                            title='Прикрепить к промпту'
                        >
                            <Paperclip className='h-4 w-4' />
                        </Button>
                    )}
                    <Button
                        size='icon'
                        variant='secondary'
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDownload();
                        }}
                        className='h-8 w-8'
                        title='Скачать файл'
                    >
                        <Download className='h-4 w-4' />
                    </Button>
                    {/* Кнопка закрепления (только для изображений) */}
                    {file.type === 'IMAGE' && onTogglePin && (
                        <Button
                            size='icon'
                            variant='secondary'
                            onClick={(e) => {
                                e.stopPropagation();
                                onTogglePin();
                            }}
                            className={`h-8 w-8 ${
                                isPinned
                                    ? 'text-yellow-400 hover:text-yellow-300'
                                    : ''
                            }`}
                            title={isPinned ? 'Открепить' : 'Закрепить'}
                        >
                            <Pin
                                className={`h-4 w-4 ${
                                    isPinned ? 'fill-current' : ''
                                }`}
                            />
                        </Button>
                    )}
                    <Button
                        size='icon'
                        variant='secondary'
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                        }}
                        className='h-8 w-8'
                        title='Закрыть'
                    >
                        <X className='h-4 w-4' />
                    </Button>
                </div>

                {/* Информация о файле */}
                <div className='absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/80 to-transparent p-4'>
                    <div className='flex items-center justify-between text-white'>
                        <span className='font-medium'>{file.filename}</span>
                        {file.size && (
                            <span className='text-sm text-slate-300'>
                                {formatFileSize(file.size)}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
