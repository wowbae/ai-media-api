// Компонент галереи всех медиафайлов чата
import { useState, useMemo, useEffect, useRef } from "react";
import {
  Download,
  X,
  Trash2,
  Paperclip,
  ChevronDown,
  ImageIcon,
  VideoIcon,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MediaPreview } from "./media-preview";
import {
  type MediaFile,
  useDeleteFileMutation,
  useGetFilesQuery,
} from "@/redux/media-api";
import {
  PANEL_HEADER_CLASSES,
  PANEL_HEADER_TITLE_CLASSES,
} from "@/lib/panel-styles";
import { getMediaFileUrl } from "@/lib/constants";
import { formatFileSize, downloadFile } from "@/lib/utils";

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
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);
  const [isVideoExpanded, setIsVideoExpanded] = useState(true);
  const [isImageExpanded, setIsImageExpanded] = useState(true);

  // Загружаем файлы с пагинацией
  const {
    data: filesData,
    isLoading,
    isFetching,
  } = useGetFilesQuery({
    page,
    limit: 50, // Загружаем по 50 файлов за раз
  });

  const allFiles = useMemo(() => filesData?.data || [], [filesData]);

  // Разделяем файлы на видео и изображения
  const { videoFiles, imageFiles } = useMemo(() => {
    const videos: MediaFile[] = [];
    const images: MediaFile[] = [];

    allFiles.forEach((file) => {
      if (file.type === "VIDEO") {
        videos.push(file);
      } else if (file.type === "IMAGE") {
        images.push(file);
      }
    });

    return { videoFiles: videos, imageFiles: images };
  }, [allFiles]);

  // Отображаемые файлы
  const visibleVideoFiles = useMemo(() => videoFiles, [videoFiles]);
  const visibleImageFiles = useMemo(() => imageFiles, [imageFiles]);

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
      { threshold: 0.1 },
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
    try {
      await deleteFile(fileId).unwrap();
    } catch (error) {
      console.error("Ошибка удаления файла:", error);
    }
  }

  // Показываем скелетоны во время загрузки
  if (isLoading) {
    return (
      <div className="flex h-full w-[30%] flex-col border-l border-slate-700 bg-slate-800/50">
        <div className={PANEL_HEADER_CLASSES}>
          <h2 className={PANEL_HEADER_TITLE_CLASSES}>Медиафайлы</h2>
        </div>
        <ScrollArea className="flex-1">
          <div className="grid grid-cols-3 gap-2 p-4">
            {Array.from({ length: INITIAL_FILES_LIMIT }).map((_, index) => (
              <Skeleton
                key={`skeleton-${index}`}
                className="aspect-square w-full rounded-xl"
              />
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  }

  if (allFiles.length === 0) {
    return (
      <div className="flex h-full w-[30%] flex-col border-l border-slate-700 bg-slate-800/50">
        <div className={PANEL_HEADER_CLASSES}>
          <h2 className={PANEL_HEADER_TITLE_CLASSES}>Медиафайлы</h2>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-slate-400">Нет медиафайлов</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-full w-[30%] flex-col border-l border-slate-700 bg-slate-800/50">
        {/* Заголовок */}
        <div className={PANEL_HEADER_CLASSES}>
          <h2 className={PANEL_HEADER_TITLE_CLASSES}>
            Медиафайлы ({allFiles.length})
          </h2>
        </div>

        {/* Grid с файлами */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Секция видео */}
            {videoFiles.length > 0 && (
              <div>
                <button
                  onClick={() => setIsVideoExpanded(!isVideoExpanded)}
                  className="flex w-full items-center justify-between rounded-lg bg-slate-700/0 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 transition-colors"
                >
                  <div className="flex gap-2 items-center">
                    <VideoIcon className="h-4 w-4" />
                    <span>Видео ({videoFiles.length})</span>
                  </div>

                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      isVideoExpanded ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isVideoExpanded && (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {visibleVideoFiles.map((file) => (
                      <div
                        key={file.id}
                        className="group relative cursor-pointer transition-transform hover:scale-105"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFileClick(file);
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleFileClick(file);
                          }
                        }}
                      >
                        <div onClick={(e) => e.stopPropagation()}>
                          <MediaPreview file={file} className="h-full w-full" />
                        </div>
                        {/* Кнопка прикрепления слева вверху (только для изображений) */}
                        {onAttachFile && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="absolute left-1 top-1 h-6 w-6 text-slate-400 opacity-0 transition-opacity hover:text-cyan-400 hover:bg-cyan-600/20 group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              const fileUrl = getMediaFileUrl(file.path);
                              onAttachFile(fileUrl, file.filename);
                            }}
                            title="Прикрепить к промпту"
                          >
                            <Paperclip className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {/* Кнопка удаления справа вверху */}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="absolute right-1 top-1 h-6 w-6 text-slate-400 opacity-0 transition-opacity hover:text-red-400 hover:bg-red-600/20 group-hover:opacity-100"
                          onClick={(e) => handleDeleteFile(e, file.id)}
                          disabled={isDeleting}
                          title="Удалить файл"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Секция изображений */}
            {imageFiles.length > 0 && (
              <div>
                <button
                  onClick={() => setIsImageExpanded(!isImageExpanded)}
                  className="flex w-full items-center justify-between rounded-lg bg-slate-700/0 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 transition-colors"
                >
                  <div className="flex gap-2 items-center">
                    <ImageIcon className="h-4 w-4" />
                    <span>Изображения ({imageFiles.length})</span>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      isImageExpanded ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isImageExpanded && (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {visibleImageFiles.map((file) => (
                      <div
                        key={file.id}
                        className="group relative cursor-pointer transition-transform hover:scale-105"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFileClick(file);
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleFileClick(file);
                          }
                        }}
                      >
                        <div onClick={(e) => e.stopPropagation()}>
                          <MediaPreview file={file} className="h-full w-full" />
                        </div>
                        {/* Кнопка прикрепления слева вверху (только для изображений) */}
                        {onAttachFile && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="absolute left-1 top-1 h-6 w-6 text-slate-400 opacity-0 transition-opacity hover:text-cyan-400 hover:bg-cyan-600/20 group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              const fileUrl = getMediaFileUrl(file.path);
                              onAttachFile(fileUrl, file.filename);
                            }}
                            title="Прикрепить к промпту"
                          >
                            <Paperclip className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {/* Кнопка удаления справа вверху */}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="absolute right-1 top-1 h-6 w-6 text-slate-400 opacity-0 transition-opacity hover:text-red-400 hover:bg-red-600/20 group-hover:opacity-100"
                          onClick={(e) => handleDeleteFile(e, file.id)}
                          disabled={isDeleting}
                          title="Удалить файл"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Триггер для lazy loading следующей страницы */}
            {filesData?.pagination &&
              filesData.pagination.page < filesData.pagination.totalPages && (
                <div
                  ref={loadMoreTriggerRef}
                  className="flex h-20 items-center justify-center"
                >
                  {isFetching ? (
                    <div className="text-xs text-slate-400">Загрузка...</div>
                  ) : (
                    <div className="h-1 w-1 rounded-full bg-slate-600" />
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
        />
      )}
    </>
  );
}

interface MediaFullscreenViewProps {
  file: MediaFile;
  onClose: () => void;
  onAttachFile?: (fileUrl: string, filename: string) => void;
}

function MediaFullscreenView({
  file,
  onClose,
  onAttachFile,
}: MediaFullscreenViewProps) {
  const fileUrl = getMediaFileUrl(file.path);
  // Поддержка base64 превью из оптимистичного обновления
  const previewUrl = file.previewPath
    ? file.previewPath.startsWith("data:") ||
      file.previewPath.startsWith("__pending__")
      ? file.previewPath.replace("__pending__", "")
      : getMediaFileUrl(file.previewPath)
    : undefined;

  // Обработка клавиши Escape для закрытия
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  function handleDownload() {
    downloadFile(fileUrl, file.filename);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      <div
        className="relative max-h-[95vh] max-w-[95vw]"
        onClick={(e) => e.stopPropagation()}
      >
        {file.type === "IMAGE" && (
          <img
            src={fileUrl}
            alt={file.filename}
            className="max-h-[90vh] max-w-[90vw] object-contain"
          />
        )}

        {file.type === "VIDEO" && (
          <video
            src={fileUrl}
            poster={previewUrl}
            controls
            // autoPlay
            muted
            className="max-h-[90vh] max-w-[90vw]"
          />
        )}

        {file.type === "AUDIO" && (
          <div className="flex flex-col items-center gap-4 rounded-lg bg-slate-800 p-8">
            <audio src={fileUrl} controls />
            <p className="text-white">{file.filename}</p>
          </div>
        )}

        {/* Кнопки действий */}
        <div className="absolute right-2 top-2 flex gap-2">
          {/* Кнопка прикрепления (только для изображений) */}
          {file.type === "IMAGE" && onAttachFile && (
            <Button
              size="icon"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                onAttachFile(fileUrl, file.filename);
              }}
              className="h-8 w-8"
              title="Прикрепить к промпту"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="icon"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              handleDownload();
            }}
            className="h-8 w-8"
            title="Скачать файл"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="h-8 w-8"
            title="Закрыть"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Информация о файле */}
        <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/80 to-transparent p-4">
          <div className="flex items-center justify-between text-white">
            <span className="font-medium">{file.filename}</span>
            <span className="text-sm text-slate-300">
              {formatFileSize(file.size)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
