// Компонент карточки файла в галерее (извлечён из media-gallery.tsx для устранения дублирования)
import {
    Trash2,
    Paperclip,
    Pin,
    RefreshCcw,
    Maximize2,
    Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MediaPreview } from './media-preview';
import type { MediaFile } from '@/redux/media-api';
import { getMediaFileUrl } from '@/lib/constants';

interface GalleryFileCardProps {
    file: MediaFile;
    onClick: (file: MediaFile) => void;
    onAttachFile?: (fileUrl: string, filename: string, imgbbUrl?: string) => void;
    onRepeatRequest?: (requestId: number) => void;
    onDeleteFile: (event: React.MouseEvent, fileId: number) => void;
    onTogglePin?: (fileId: number) => void;
    isDeleting: boolean;
    attachingFile: boolean;
    onLoadingEffect: () => void;
    // Для изображений: показывать кнопку pin
    isPinned?: boolean;
    // Для видео: показывать кнопку maximize
    isVideo?: boolean;
}

export function GalleryFileCard({
    file,
    onClick,
    onAttachFile,
    onRepeatRequest,
    onDeleteFile,
    onTogglePin,
    isDeleting,
    attachingFile,
    onLoadingEffect,
    isPinned,
    isVideo,
}: GalleryFileCardProps) {
    function handleAttach(e: React.MouseEvent) {
        e.stopPropagation();
        if (!onAttachFile) return;

        // Используем path если есть, иначе url (для файлов на imgbb)
        const fileUrl = file.path
            ? getMediaFileUrl(file.path)
            : file.url;

        if (!fileUrl) {
            console.warn('[MediaGallery] Нет file.path и file.url');
            alert('Ошибка: у файла отсутствует путь или URL. Невозможно прикрепить файл.');
            return;
        }

        onLoadingEffect();
        // Передаем file.url как imgbbUrl для изображений, чтобы не загружать на imgbb повторно
        onAttachFile(
            fileUrl,
            file.filename,
            file.type === 'IMAGE' ? (file.url || undefined) : undefined
        );
    }

    return (
        <div
            className='group relative cursor-pointer transition-transform hover:scale-105'
            onClick={(e) => {
                e.stopPropagation();
                onClick(file);
            }}
            role='button'
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick(file);
                }
            }}
        >
            <div onClick={(e) => e.stopPropagation()}>
                <MediaPreview
                    file={file}
                    className='h-full w-full'
                />
            </div>

            {/* Кнопка прикрепления */}
            {onAttachFile && (
                <Button
                    size='icon'
                    variant='ghost'
                    className='absolute left-1 top-1 h-6 w-6 text-slate-400 opacity-0 transition-opacity hover:text-cyan-400 hover:bg-cyan-600/20 group-hover:opacity-100'
                    onClick={handleAttach}
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
                        onRepeatRequest(file.requestId);
                    }}
                    title='Повторить запрос'
                >
                    <RefreshCcw className='h-3.5 w-3.5' />
                </Button>
            )}

            {/* Кнопка развернуть видео */}
            {isVideo && (
                <Button
                    size='icon'
                    variant='ghost'
                    className='absolute left-1 top-8 h-6 w-6 text-slate-400 opacity-0 transition-opacity hover:text-blue-400 hover:bg-blue-600/20 group-hover:opacity-100'
                    onClick={(e) => {
                        e.stopPropagation();
                        onClick(file);
                    }}
                    title='Развернуть видео'
                >
                    <Maximize2 className='h-3.5 w-3.5' />
                </Button>
            )}

            {/* Кнопка закрепления (только для изображений) */}
            {onTogglePin && (
                <Button
                    size='icon'
                    variant='ghost'
                    className={`absolute right-7 top-1 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100 ${
                        isPinned
                            ? 'text-yellow-400 hover:text-yellow-300 hover:bg-yellow-600/20'
                            : 'text-slate-400 hover:text-yellow-400 hover:bg-yellow-600/20'
                    }`}
                    onClick={(e) => {
                        e.stopPropagation();
                        onTogglePin(file.id);
                    }}
                    title={isPinned ? 'Открепить' : 'Закрепить'}
                >
                    <Pin className={`h-3.5 w-3.5 ${isPinned ? 'fill-current' : ''}`} />
                </Button>
            )}

            {/* Кнопка удаления */}
            <Button
                size='icon'
                variant='ghost'
                className='absolute right-1 top-1 h-6 w-6 text-slate-400 opacity-0 transition-opacity hover:text-red-400 hover:bg-red-600/20 group-hover:opacity-100'
                onClick={(e) => onDeleteFile(e, file.id)}
                disabled={isDeleting}
                title='Удалить файл'
            >
                <Trash2 className='h-3.5 w-3.5' />
            </Button>
        </div>
    );
}
