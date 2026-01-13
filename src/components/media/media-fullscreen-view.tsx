// Компонент полноэкранного просмотра медиафайла
import { useEffect } from 'react';
import { Download, X, Paperclip, RefreshCcw, Pin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type MediaFile } from '@/redux/media-api';
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
    // Для видео используем path, если его нет - возвращаем null
    // Для изображений можно использовать url (imgbb) если path нет
    if (file.type === 'VIDEO' && !file.path) return null;
    if (file.type === 'IMAGE' && !file.path && !file.url) return null;

    // Для видео всегда используем path (оригинальный файл)
    // Для изображений используем path если есть, иначе url (imgbb)
    const fileUrl =
        file.type === 'VIDEO'
            ? getMediaFileUrl(file.path!)
            : file.path
              ? getMediaFileUrl(file.path)
              : file.url || '';

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
            className='fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm'
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
                        className='max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl'
                    />
                )}

                {file.type === 'VIDEO' && file.path && (
                    <div className='relative rounded-lg overflow-hidden shadow-2xl'>
                        <video
                            src={fileUrl}
                            controls
                            autoPlay
                            className='max-h-[90vh] w-full'
                        />
                    </div>
                )}

                {file.type === 'AUDIO' && (
                    <div className='flex flex-col items-center gap-4 rounded-xl bg-secondary p-8 shadow-2xl border border-border'>
                        <audio src={fileUrl} controls />
                        <p className='text-foreground font-medium'>{file.filename}</p>
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
                            className='h-8 w-8 hover:bg-primary hover:text-primary-foreground'
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
                            className='h-8 w-8 text-muted-foreground hover:text-primary'
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
                        className='h-8 w-8 hover:bg-secondary/80'
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
                                    ? 'text-primary hover:text-primary/80'
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
