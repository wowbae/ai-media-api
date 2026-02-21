// Компонент галереи всех медиафайлов чата
import { useState, useMemo, useEffect, useRef } from 'react';
import {
    ChevronDown,
    ImageIcon,
    VideoIcon,
    Pin,
    RefreshCcw,
    Download,
    X,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { MediaPreview } from './media-preview';
import { MediaFullscreenView } from './media-fullscreen-view';
import { GalleryFileCard } from './gallery-file-card';
import {
    type MediaFile,
    useDeleteFileMutation,
    useGetFilesQuery,
    useGetChatQuery,
    useGetPricingQuery,
} from '@/redux/media-api';
import {
    PANEL_HEADER_CLASSES,
    PANEL_HEADER_TITLE_CLASSES,
} from '@/lib/panel-styles';
import { getMediaFileUrl } from '@/lib/constants';
import { cn, downloadFile, getOriginalFileUrl } from '@/lib/utils';
import { calculateTotalChatCost, formatCost } from '@/lib/cost-utils';
import { createLoadingEffectForAttachFile } from '@/lib/media-utils';

interface MediaGalleryProps {
    chatId?: number; // Optional - если не указан, загружаем все файлы
    onAttachFile?: (fileUrl: string, filename: string, imgbbUrl?: string) => void;
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

    // Создаем функцию для эффекта загрузки
    const loadingEffectForAttachFile = useMemo(
        () => createLoadingEffectForAttachFile(setAttachingFile),
        []
    );

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
            } catch (error) {
                console.error('Error loading pinned images:', error);
            }
        } else {
            setPinnedImageIds(new Set<number>());
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

    // Загружаем карту цен для fallback по модели (для старых запросов без costUsd)
    const { data: pricingMap } = useGetPricingQuery();

    // Расчет суммарной стоимости
    const totalCost = useMemo(() => {
        if (!chatData?.requests) return 0;
        return calculateTotalChatCost(chatData.requests, pricingMap);
    }, [chatData?.requests, pricingMap]);

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
                const currentPinnedIds = pinnedImageIds;

                // Сохраняем закрепленные файлы из предыдущего списка, которых нет в новых данных
                // ВАЖНО: не сохраняем файлы, которые уже есть в новых данных, чтобы не дублировать
                // и не перезаписывать актуальные данные о превью устаревшими
                const preservedPinnedFiles = prev.filter(
                    (f) => currentPinnedIds.has(f.id) && !newFilesIds.has(f.id)
                );

                // ВАЖНО: файлы из filesData.data имеют приоритет над сохраненными,
                // так как они содержат актуальные данные о превью из пагинации
                return [...preservedPinnedFiles, ...filesData.data];
            });
        } else {
            // Для последующих страниц добавляем новые файлы
            // ВАЖНО: если файл уже есть в списке (например, из chatData), заменяем его актуальными данными из пагинации
            setAccumulatedFiles((prev) => {
                const newFilesIds = new Set(filesData.data.map((f) => f.id));
                const existingIds = new Set(prev.map((f) => f.id));
                const newFiles = filesData.data.filter(
                    (f) => !existingIds.has(f.id)
                );

                // Обновляем существующие файлы актуальными данными из пагинации
                // Это важно для закрепленных файлов, которые были предзагружены из chatData
                // Создаем Map для быстрого поиска обновленных файлов
                const updatedFilesMap = new Map(
                    filesData.data.map((f) => [f.id, f])
                );

                // Обновляем существующие файлы или оставляем их как есть
                const updatedFiles = prev.map((existingFile) => {
                    // Если файл есть в новых данных - используем их (актуальные данные о превью)
                    return updatedFilesMap.get(existingFile.id) || existingFile;
                });

                return [...updatedFiles, ...newFiles];
            });
        }
    }, [filesData, page]);

    // Предзагрузка закрепленных файлов из chatData, если они еще не загружены через пагинацию
    useEffect(() => {
        if (!chatData?.requests || pinnedImageIds.size === 0) return;

        setAccumulatedFiles((prev) => {
            const existingIds = new Set(prev.map((f) => f.id));
            const currentPinnedIds = pinnedImageIds;
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

        accumulatedFiles.forEach((file) => {
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
    }, [accumulatedFiles, pinnedImageIds]);

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

    if (accumulatedFiles.length === 0) {
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
                        Медиафайлы ({accumulatedFiles.length})
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
                                        {pinnedImages.map((file) => (
                                            <GalleryFileCard
                                                key={file.id}
                                                file={file}
                                                onClick={handleFileClick}
                                                onAttachFile={onAttachFile}
                                                onRepeatRequest={onRepeatRequest}
                                                onDeleteFile={handleDeleteFile}
                                                onTogglePin={togglePinImage}
                                                isDeleting={isDeleting}
                                                attachingFile={attachingFile}
                                                onLoadingEffect={loadingEffectForAttachFile}
                                                isPinned={true}
                                            />
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
                                        {unpinnedImages.map((file) => (
                                            <GalleryFileCard
                                                key={file.id}
                                                file={file}
                                                onClick={handleFileClick}
                                                onAttachFile={onAttachFile}
                                                onRepeatRequest={onRepeatRequest}
                                                onDeleteFile={handleDeleteFile}
                                                onTogglePin={togglePinImage}
                                                isDeleting={isDeleting}
                                                attachingFile={attachingFile}
                                                onLoadingEffect={loadingEffectForAttachFile}
                                                isPinned={false}
                                            />
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
                                        {videoFiles.map((file) => (
                                            <GalleryFileCard
                                                key={file.id}
                                                file={file}
                                                onClick={handleFileClick}
                                                onAttachFile={onAttachFile}
                                                onRepeatRequest={onRepeatRequest}
                                                onDeleteFile={handleDeleteFile}
                                                isDeleting={isDeleting}
                                                attachingFile={attachingFile}
                                                onLoadingEffect={loadingEffectForAttachFile}
                                                isVideo={true}
                                            />
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
                    {selectedFile.type === 'VIDEO' && (
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
                                        src={getOriginalFileUrl(selectedFile) || ''}
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
                                                const downloadUrl = getOriginalFileUrl(selectedFile);
                                                if (!downloadUrl) {
                                                    console.warn('[MediaGallery] Невозможно скачать файл: нет оригинального URL', selectedFile);
                                                    return;
                                                }
                                                downloadFile(downloadUrl, selectedFile.filename);
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
