// Компонент полноэкранного просмотра медиафайла
import { useEffect } from 'react';
import { Download, X, Paperclip, RefreshCcw, Pin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    type MediaFile,
} from '@/redux/media-api';
import { getMediaFileUrl } from '@/lib/constants';
import { formatFileSize, downloadFile } from '@/lib/utils';

interface MediaFullscreenViewProps {
    file: MediaFile;
    onClose: () => void;
    onAttachFile?: (fileUrl: string, filename: string) => void;
    onRepeatRequest?: (requestId: number) => void;
    isPinned?: boolean;
    onTogglePin?: () => void;
}

export function MediaFullscreenView({
    file,
    onClose,
    onAttachFile,
    onRepeatRequest,
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
                        // muted
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
                    {/* Кнопка повторить запрос */}
                    {onRepeatRequest && (
                        <Button
                            size='icon'
                            variant='secondary'
                            onClick={(e) => {
                                e.stopPropagation();
                                onRepeatRequest(file.requestId);
                            }}
                            className='h-8 w-8 text-purple-400 hover:text-purple-300'
                            title='Повторить запрос'
                        >
                            <RefreshCcw className='h-4 w-4' />
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
