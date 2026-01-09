// Компонент превью медиа-файлов (изображения, видео, аудио)
import { useState } from 'react';
import {
    Download,
    Maximize2,
    X,
    ImageIcon,
    Video,
    AudioLines,
    FileIcon,
    Trash2,
    Paperclip,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn, formatFileSize, downloadFile } from '@/lib/utils';
import { getMediaFileUrl } from '@/lib/constants';
import { type MediaFile, type MediaType, useDeleteFileMutation } from '@/redux/media-api';

interface MediaPreviewProps {
    file: MediaFile;
    showDelete?: boolean;
    className?: string;
    onAttach?: (fileUrl: string, filename: string) => void;
}

export function MediaPreview({ file, showDelete = false, className, onAttach }: MediaPreviewProps) {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [deleteFile, { isLoading: isDeleting }] = useDeleteFileMutation();

    // Получаем URL файла для отображения
    const fileUrl = getMediaFileUrl(file.path);
    const previewUrl = file.previewPath
        ? getMediaFileUrl(file.previewPath)
        : fileUrl;

    async function handleDelete() {
        try {
            await deleteFile(file.id).unwrap();
        } catch (error) {
            console.error('Ошибка удаления:', error);
        }
    }

    function handleDownload() {
        downloadFile(fileUrl, file.filename);
    }

    return (
        <>
            <div
                className={cn(
                    'group relative overflow-hidden rounded-xl border border-slate-600 bg-slate-800',
                    className
                )}
            >
                {/* Контент в зависимости от типа */}
                {file.type === 'IMAGE' && (
                    <ImagePreview
                        src={previewUrl}
                        alt={file.filename}
                        onClick={() => setIsFullscreen(true)}
                    />
                )}

                {file.type === 'VIDEO' && (
                    <VideoPreview
                        previewUrl={previewUrl}
                        originalUrl={fileUrl}
                        filename={file.filename}
                    />
                )}

                {file.type === 'AUDIO' && (
                    <AudioPreview
                        originalUrl={fileUrl}
                        filename={file.filename}
                    />
                )}

                {/* Overlay с действиями (не показываем для видео, чтобы не перекрывать нативные контролы) */}
                {file.type !== 'VIDEO' && (
                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                        {file.type === 'IMAGE' && (
                            <Button
                                size="icon"
                                variant="secondary"
                                className="h-8 w-8"
                                onClick={() => setIsFullscreen(true)}
                            >
                                <Maximize2 className="h-4 w-4" />
                            </Button>
                        )}

                        <Button
                            size="icon"
                            variant="secondary"
                            className="h-8 w-8"
                            onClick={handleDownload}
                        >
                            <Download className="h-4 w-4" />
                        </Button>

                        {showDelete && (
                            <Button
                                size="icon"
                                variant="destructive"
                                className="h-8 w-8"
                                onClick={handleDelete}
                                disabled={isDeleting}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                )}

                {/* Кнопка удаления для видео (не перекрывает нативные контролы) */}
                {file.type === 'VIDEO' && showDelete && (
                    <div className="absolute right-2 top-2 z-10">
                        <Button
                            size="icon"
                            variant="destructive"
                            className="h-8 w-8 bg-black/70 hover:bg-red-600/80"
                            onClick={handleDelete}
                            disabled={isDeleting}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                )}

                {/* Информация о файле */}
                <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/80 to-transparent p-2">
                    <div className="flex items-center justify-between">
                        <TypeIcon type={file.type} />
                        <span className="text-xs text-slate-300">
                            {formatFileSize(file.size)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Полноэкранный просмотр для изображений */}
            {file.type === 'IMAGE' && (
                <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
                    <DialogContent
                        showCloseButton={false}
                        className="max-h-[95vh] max-w-[95vw] overflow-hidden border-slate-700 bg-slate-900 p-0"
                    >
                        <DialogTitle className="sr-only">
                            Просмотр изображения: {file.filename}
                        </DialogTitle>
                        <div className="relative">
                            <img
                                src={fileUrl}
                                alt={file.filename}
                                className="max-h-[90vh] w-full object-contain"
                            />
                            <div className="absolute right-2 top-2 flex gap-2">
                                <Button
                                    size="icon"
                                    variant="secondary"
                                    onClick={handleDownload}
                                >
                                    <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                    size="icon"
                                    variant="secondary"
                                    onClick={() => setIsFullscreen(false)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                                <div className="flex items-center justify-between text-white">
                                    <span className="font-medium">{file.filename}</span>
                                    <span className="text-sm text-slate-300">
                                        {getImageDimensions(file.metadata)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}

// Превью изображения
interface ImagePreviewProps {
    src: string;
    alt: string;
    onClick?: () => void;
}

function ImagePreview({ src, alt, onClick }: ImagePreviewProps) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);

    return (
        <div
            className="relative aspect-square cursor-pointer overflow-hidden"
            onClick={onClick}
        >
            {!isLoaded && !hasError && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                    <ImageIcon className="h-8 w-8 animate-pulse text-slate-600" />
                </div>
            )}
            {hasError ? (
                <div className="flex h-full items-center justify-center bg-slate-800">
                    <FileIcon className="h-8 w-8 text-slate-600" />
                </div>
            ) : (
                <img
                    src={src}
                    alt={alt}
                    loading="lazy"
                    className={cn(
                        'h-full w-full object-cover transition-opacity',
                        isLoaded ? 'opacity-100' : 'opacity-0'
                    )}
                    onLoad={() => setIsLoaded(true)}
                    onError={() => setHasError(true)}
                />
            )}
        </div>
    );
}

// Превью видео - показывает только превью, оригинал загружается по требованию
interface VideoPreviewProps {
    previewUrl: string;
    originalUrl: string;
    filename: string;
}

function VideoPreview({ previewUrl, originalUrl, filename }: VideoPreviewProps) {
    const [shouldLoadOriginal, setShouldLoadOriginal] = useState(false);
    const [isPreviewLoaded, setIsPreviewLoaded] = useState(false);
    const [hasPreviewError, setHasPreviewError] = useState(false);

    function handlePlay() {
        // Загружаем оригинал только при попытке воспроизведения
        setShouldLoadOriginal(true);
    }

    // Если пользователь хочет воспроизвести - показываем оригинал
    // Контролы видео скрыты по умолчанию, показываются при наведении (стили в styles.css)
    if (shouldLoadOriginal) {
        return (
            <div className="group/video relative aspect-square">
                <video
                    src={originalUrl}
                    poster={previewUrl}
                    controls
                    // autoPlay
                    className="h-full w-full object-cover video-controls-on-hover"
                />
            </div>
        );
    }

    // Если нет превью - показываем плейсхолдер с кнопкой воспроизведения
    if (!previewUrl || hasPreviewError) {
        return (
            <div
                className="relative aspect-square cursor-pointer overflow-hidden bg-slate-800"
                onClick={handlePlay}
            >
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <div className="rounded-full bg-white/20 p-6 backdrop-blur-sm">
                        <Video className="h-12 w-12 text-white" />
                    </div>
                    <p className="text-sm text-slate-300">Нажмите для воспроизведения</p>
                </div>
            </div>
        );
    }

    // Показываем только превью (lazy loading оригинала)
    return (
        <div
            className="relative aspect-square cursor-pointer overflow-hidden"
            onClick={handlePlay}
        >
            <img
                src={previewUrl}
                alt={filename}
                loading="lazy"
                className={cn(
                    'h-full w-full object-cover transition-opacity',
                    isPreviewLoaded ? 'opacity-100' : 'opacity-0'
                )}
                onLoad={() => setIsPreviewLoaded(true)}
                onError={() => {
                    setHasPreviewError(true);
                    setShouldLoadOriginal(true);
                }}
            />
            {!isPreviewLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                    <Video className="h-8 w-8 animate-pulse text-slate-600" />
                </div>
            )}
            {/* Overlay с иконкой воспроизведения */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity hover:bg-black/40">
                <div className="rounded-full bg-white/20 p-4 backdrop-blur-sm">
                    <Video className="h-8 w-8 text-white" />
                </div>
            </div>
        </div>
    );
}

// Превью аудио - показывает иконку, оригинал загружается по требованию
interface AudioPreviewProps {
    originalUrl: string;
    filename: string;
}

function AudioPreview({ originalUrl, filename }: AudioPreviewProps) {
    const [shouldLoadOriginal, setShouldLoadOriginal] = useState(false);

    function handlePlay() {
        // Загружаем оригинал только при попытке воспроизведения
        setShouldLoadOriginal(true);
    }

    return (
        <div className="flex aspect-video flex-col items-center justify-center gap-3 bg-slate-800 p-4">
            <AudioLines className="h-12 w-12 text-cyan-400" />
            <p className="text-xs text-slate-400 text-center max-w-full truncate">
                {filename}
            </p>
            {shouldLoadOriginal ? (
                <audio src={originalUrl} controls autoPlay className="w-full" />
            ) : (
                <Button
                    onClick={handlePlay}
                    variant="secondary"
                    className="mt-2"
                >
                    <AudioLines className="mr-2 h-4 w-4" />
                    Воспроизвести
                </Button>
            )}
        </div>
    );
}

// Иконка типа файла
interface TypeIconProps {
    type: MediaType;
}

function TypeIcon({ type }: TypeIconProps) {
    const config = {
        IMAGE: { icon: ImageIcon },
        VIDEO: { icon: Video },
        AUDIO: { icon: AudioLines },
    };

    const { icon: Icon } = config[type];

    return (
        <Icon className="h-4 w-4 text-slate-300" />
    );
}

// Получение размеров изображения из метаданных
function getImageDimensions(metadata: Record<string, unknown>): string {
    const width = metadata.width as number | undefined;
    const height = metadata.height as number | undefined;
    if (width && height) {
        return `${width} × ${height}`;
    }
    return '';
}

