// Компонент галереи всех медиафайлов чата
import { useState, useMemo, useEffect } from 'react';
import { Download, X, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { MediaPreview } from './media-preview';
import {
    type MediaFile,
    type MediaRequest,
    useDeleteFileMutation,
} from '@/redux/media-api';
import {
    PANEL_HEADER_CLASSES,
    PANEL_HEADER_TITLE_CLASSES,
} from '@/lib/panel-styles';
import { getMediaFileUrl } from '@/lib/constants';
import { formatFileSize, downloadFile } from '@/lib/utils';

interface MediaGalleryProps {
    requests: MediaRequest[];
}

export function MediaGallery({ requests }: MediaGalleryProps) {
    const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
    const [deleteFile, { isLoading: isDeleting }] = useDeleteFileMutation();

    // Собираем все файлы из всех requests, сортируем по дате (новые сверху)
    const allFiles = useMemo(() => {
        const files: MediaFile[] = [];

        requests.forEach((request) => {
            if (request.files && request.files.length > 0) {
                files.push(...request.files);
            }
        });

        // Сортируем по дате создания (новые сверху)
        return files.sort(
            (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
        );
    }, [requests]);

    function handleFileClick(file: MediaFile) {
        setSelectedFile(file);
    }

    async function handleDeleteFile(event: React.MouseEvent, fileId: number) {
        event.stopPropagation();
        try {
            await deleteFile(fileId).unwrap();
        } catch (error) {
            console.error('Ошибка удаления файла:', error);
        }
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
                    <div className='grid grid-cols-4 gap-2 p-4'>
                        {allFiles.map((file) => (
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
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        handleFileClick(file);
                                    }
                                }}
                            >
                                <div onClick={(e) => e.stopPropagation()}>
                                    <MediaPreview
                                        file={file}
                                        className='h-full w-full'
                                    />
                                </div>
                                {/* Кнопка удаления справа вверху в углу */}
                                <Button
                                    size='icon'
                                    variant='ghost'
                                    className='absolute right-1 top-1 h-6 w-6 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400 hover:bg-red-600/20'
                                    onClick={(e) =>
                                        handleDeleteFile(e, file.id)
                                    }
                                    disabled={isDeleting}
                                    title='Удалить файл'
                                >
                                    <Trash2 className='h-3.5 w-3.5' />
                                </Button>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            {/* Полноэкранный просмотр */}
            {selectedFile && (
                <MediaFullscreenView
                    file={selectedFile}
                    onClose={() => setSelectedFile(null)}
                />
            )}
        </>
    );
}

interface MediaFullscreenViewProps {
    file: MediaFile;
    onClose: () => void;
}

function MediaFullscreenView({ file, onClose }: MediaFullscreenViewProps) {
    const fileUrl = getMediaFileUrl(file.path);
    const previewUrl = file.previewPath
        ? getMediaFileUrl(file.previewPath)
        : fileUrl;

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
                        autoPlay
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
                    <Button
                        size='icon'
                        variant='secondary'
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDownload();
                        }}
                        className='h-8 w-8'
                    >
                        <Download className='h-4 w-4' />
                    </Button>
                    <Button
                        size='icon'
                        variant='secondary'
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                        }}
                        className='h-8 w-8'
                    >
                        <X className='h-4 w-4' />
                    </Button>
                </div>

                {/* Информация о файле */}
                <div className='absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/80 to-transparent p-4'>
                    <div className='flex items-center justify-between text-white'>
                        <span className='font-medium'>{file.filename}</span>
                        <span className='text-sm text-slate-300'>
                            {formatFileSize(file.size)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
