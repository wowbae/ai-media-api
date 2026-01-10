// Компонент превью медиа-файлов (изображения, видео, аудио)
import { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatFileSize, downloadFile } from "@/lib/utils";
import { getMediaFileUrl } from "@/lib/constants";
import {
  type MediaFile,
  type MediaType,
  useDeleteFileMutation,
  useUploadThumbnailMutation,
} from "@/redux/media-api";
import {
  extractVideoThumbnail,
  isThumbnailPending,
  markThumbnailPending,
  unmarkThumbnailPending,
} from "@/lib/video-thumbnail";

interface MediaPreviewProps {
  file: MediaFile;
  showDelete?: boolean;
  className?: string;
  onAttach?: (fileUrl: string, filename: string) => void;
}

export function MediaPreview({
  file,
  showDelete = false,
  className,
  onAttach,
}: MediaPreviewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [deleteFile, { isLoading: isDeleting }] = useDeleteFileMutation();

  // Для полноэкранного просмотра и скачивания ВСЕГДА используем оригинальный локальный файл
  // file.url (imgbb) может быть сжатым (display_url), а file.path - оригиналом
  // Приоритет: path (локальный оригинал) > url (imgbb как fallback)
  const originalFileUrl = file.path ? getMediaFileUrl(file.path) : (file.url || null);

  // previewUrl для изображений (для видео логика внутри VideoPreview)
  // Приоритет: previewUrl (imgbb) > previewPath (локальный) > url (imgbb fallback) > path (локальный оригинал)
  const imagePreviewUrl = file.previewUrl ||
    (file.previewPath ? getMediaFileUrl(file.previewPath) : null) ||
    file.url ||
    originalFileUrl;

  async function handleDelete() {
    try {
      await deleteFile(file.id).unwrap();
    } catch (error) {
      console.error("Ошибка удаления:", error);
    }
  }

  function handleDownload() {
    if (originalFileUrl) {
      downloadFile(originalFileUrl, file.filename);
    } else {
      console.warn('[MediaPreview] Невозможно скачать файл: нет URL или path', file);
    }
  }

  return (
    <>
      <div
        className={cn(
          "group relative overflow-hidden rounded-xl border border-slate-600 bg-slate-800",
          className,
        )}
      >
        {/* Контент в зависимости от типа */}
        {file.type === "IMAGE" && (
          <ImagePreview
            src={imagePreviewUrl}
            alt={file.filename}
            onClick={() => setIsFullscreen(true)}
          />
        )}

        {file.type === "VIDEO" && (
          <VideoPreview
            fileId={file.id}
            previewUrl={file.previewUrl || file.previewPath}
            originalUrl={originalFileUrl || ''}
            filename={file.filename}
          />
        )}

        {file.type === "AUDIO" && (
          <AudioPreview originalUrl={originalFileUrl || ''} filename={file.filename} />
        )}

        {/* Overlay с действиями (не показываем для видео, чтобы не перекрывать нативные контролы) */}
        {file.type !== "VIDEO" && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
            {file.type === "IMAGE" && (
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
        {file.type === "VIDEO" && showDelete && (
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
      {file.type === "IMAGE" && (
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
                src={originalFileUrl || file.url || ''}
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
              <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/80 to-transparent p-4">
                <div className="flex items-center justify-between text-white">
                  <span className="font-medium">{file.filename}</span>
                  <span className="text-sm text-slate-300">
                    {getImageDimensions(file.width, file.height)}
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
            "h-full w-full object-cover transition-opacity",
            isLoaded ? "opacity-100" : "opacity-0",
          )}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
        />
      )}
    </div>
  );
}

// Превью видео - показывает только превью, оригинал загружается по требованию
// Автоматически генерирует thumbnail если его нет
interface VideoPreviewProps {
  fileId: number;
  previewUrl: string | null;
  originalUrl: string;
  filename: string;
}

function VideoPreview({
  fileId,
  previewUrl,
  originalUrl,
  filename,
}: VideoPreviewProps) {
  const [shouldLoadOriginal, setShouldLoadOriginal] = useState(false);
  const [isPreviewLoaded, setIsPreviewLoaded] = useState(false);
  const [hasPreviewError, setHasPreviewError] = useState(false);
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);
  const [localThumbnail, setLocalThumbnail] = useState<string | null>(null);
  const thumbnailGeneratedRef = useRef(false);

  const [uploadThumbnail] = useUploadThumbnailMutation();

  // Проверяем, является ли previewUrl временным (оптимистичное обновление)
  const isPendingPreview = previewUrl?.startsWith("__pending__") ?? false;
  const actualPreviewUrl =
    isPendingPreview && previewUrl
      ? previewUrl.replace("__pending__", "")
      : previewUrl;

  // Автоматическая генерация thumbnail если его нет
  useEffect(() => {
    // Пропускаем если:
    // - уже есть превью
    // - генерация уже запущена
    // - уже пытались генерировать
    // - файл в процессе генерации глобально
    if (
      previewUrl ||
      isGeneratingThumbnail ||
      thumbnailGeneratedRef.current ||
      isThumbnailPending(fileId)
    ) {
      return;
    }

    async function generateThumbnail() {
      thumbnailGeneratedRef.current = true;
      markThumbnailPending(fileId);
      setIsGeneratingThumbnail(true);

      try {
        const thumbnail = await extractVideoThumbnail(originalUrl);

        if (thumbnail) {
          // Сразу показываем локально
          setLocalThumbnail(thumbnail);

          // Отправляем на сервер в фоне
          uploadThumbnail({ fileId, thumbnail }).catch((error) => {
            console.warn(
              "[VideoPreview] Ошибка загрузки thumbnail на сервер:",
              error,
            );
          });
        }
      } catch (error) {
        console.warn("[VideoPreview] Ошибка генерации thumbnail:", error);
      } finally {
        setIsGeneratingThumbnail(false);
        unmarkThumbnailPending(fileId);
      }
    }

    generateThumbnail();
  }, [fileId, previewUrl, originalUrl, isGeneratingThumbnail, uploadThumbnail]);

  function handlePlay() {
    // Загружаем оригинал только при попытке воспроизведения
    setShouldLoadOriginal(true);
  }

  // Определяем какой URL использовать для превью
  // Приоритет: base64 (data:) > HTTP URL (imgbb) > локальный путь
  const displayPreviewUrl = actualPreviewUrl
    ? actualPreviewUrl.startsWith("data:")
      ? actualPreviewUrl // base64 из оптимистичного обновления
      : actualPreviewUrl.startsWith("http://") || actualPreviewUrl.startsWith("https://")
        ? actualPreviewUrl // HTTP URL на imgbb
        : getMediaFileUrl(actualPreviewUrl) // локальный путь
    : localThumbnail;

  // Если пользователь хочет воспроизвести - показываем оригинал
  if (shouldLoadOriginal) {
    return (
      <div className="group/video relative aspect-square">
        <video
          src={originalUrl}
          poster={displayPreviewUrl || undefined}
          controls
          className="h-full w-full object-cover video-controls-on-hover"
        />
      </div>
    );
  }

  // Если генерируется thumbnail - показываем скелетон
  if (isGeneratingThumbnail && !localThumbnail) {
    return (
      <div
        className="relative aspect-square cursor-pointer overflow-hidden"
        onClick={handlePlay}
      >
        <Skeleton className="h-full w-full rounded-none" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-full bg-white/20 p-4 backdrop-blur-sm animate-pulse">
            <Video className="h-8 w-8 text-white" />
          </div>
        </div>
      </div>
    );
  }

  // Если нет превью и нет локального thumbnail - показываем плейсхолдер
  if (!displayPreviewUrl || hasPreviewError) {
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

  // Показываем превью (серверное или локальное)
  return (
    <div
      className="relative aspect-square cursor-pointer overflow-hidden"
      onClick={handlePlay}
    >
      <img
        src={displayPreviewUrl}
        alt={filename}
        loading="lazy"
        className={cn(
          "h-full w-full object-cover transition-opacity",
          isPreviewLoaded ? "opacity-100" : "opacity-0",
        )}
        onLoad={() => setIsPreviewLoaded(true)}
        onError={() => {
          setHasPreviewError(true);
        }}
      />
      {!isPreviewLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
          <Video className="h-8 w-8 animate-pulse text-slate-600" />
        </div>
      )}
      {/* Тонкий hover эффект для индикации кликабельности */}
      <div className="absolute inset-0 bg-black/0 transition-colors hover:bg-black/10" />
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
        <audio
          src={originalUrl}
          controls
          // autoPlay
          // muted
          className="w-full"
        />
      ) : (
        <Button onClick={handlePlay} variant="secondary" className="mt-2">
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

  return <Icon className="h-4 w-4 text-slate-300" />;
}

// Получение размеров изображения
function getImageDimensions(
  width: number | null | undefined,
  height: number | null | undefined,
): string {
  if (width && height) {
    return `${width} × ${height}`;
  }
  return "";
}
