// Утилита для генерации thumbnail видео на клиенте через canvas
// Используется когда на сервере нет FFmpeg или previewPath отсутствует

/**
 * Извлекает первый кадр из видео и возвращает его как base64 JPEG
 * @param videoUrl URL видеофайла
 * @returns Promise с base64 строкой изображения или null при ошибке
 */
export async function extractVideoThumbnail(
    videoUrl: string
): Promise<string | null> {
    return new Promise((resolve) => {
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.muted = true;
        video.preload = 'metadata';

        // Таймаут на случай если видео не загружается
        const timeout = setTimeout(() => {
            cleanup();
            resolve(null);
        }, 10000); // 10 секунд максимум

        function cleanup() {
            clearTimeout(timeout);
            video.removeEventListener('loadeddata', handleLoadedData);
            video.removeEventListener('error', handleError);
            video.src = '';
            video.load();
        }

        function handleError() {
            console.warn('[VideoThumbnail] Ошибка загрузки видео:', videoUrl);
            cleanup();
            resolve(null);
        }

        function handleLoadedData() {
            // Ждем немного чтобы видео успело подготовить первый кадр
            video.currentTime = 0.1; // Переходим чуть дальше начала для надежности
        }

        video.addEventListener('error', handleError);
        video.addEventListener('loadeddata', handleLoadedData);

        // Когда seeked срабатывает - видео перешло на нужный кадр
        video.addEventListener('seeked', () => {
            try {
                // Создаем canvas с размером кадра видео
                const canvas = document.createElement('canvas');
                // Ограничиваем размер для оптимизации (максимум 400x400)
                const maxSize = 400;
                const scale = Math.min(
                    maxSize / video.videoWidth,
                    maxSize / video.videoHeight,
                    1
                );
                canvas.width = video.videoWidth * scale;
                canvas.height = video.videoHeight * scale;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    cleanup();
                    resolve(null);
                    return;
                }

                // Рисуем кадр на canvas
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                // Конвертируем в base64 JPEG с качеством 80%
                const thumbnail = canvas.toDataURL('image/jpeg', 0.8);

                cleanup();
                resolve(thumbnail);
            } catch (error) {
                console.warn('[VideoThumbnail] Ошибка извлечения кадра:', error);
                cleanup();
                resolve(null);
            }
        });

        // Запускаем загрузку видео
        video.src = videoUrl;
    });
}

// Набор для отслеживания файлов, для которых уже запущена генерация
const pendingThumbnails = new Set<number>();

/**
 * Проверяет, запущена ли уже генерация thumbnail для файла
 */
export function isThumbnailPending(fileId: number): boolean {
    return pendingThumbnails.has(fileId);
}

/**
 * Помечает файл как "в процессе генерации thumbnail"
 */
export function markThumbnailPending(fileId: number): void {
    pendingThumbnails.add(fileId);
}

/**
 * Снимает пометку "в процессе генерации" с файла
 */
export function unmarkThumbnailPending(fileId: number): void {
    pendingThumbnails.delete(fileId);
}
