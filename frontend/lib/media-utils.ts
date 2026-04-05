// Общие утилиты для работы с медиа

// Константы
const ATTACH_FILE_LOADING_TIMEOUT = 1500; // мс

// Эффект загрузки при прикреплении файла
// Устанавливает состояние загрузки на указанное время
export function createLoadingEffectForAttachFile(
    setAttachingFile: (value: boolean) => void,
): () => void {
    return function loadingEffectForAttachFile() {
        setAttachingFile(true);
        setTimeout(() => {
            setAttachingFile(false);
        }, ATTACH_FILE_LOADING_TIMEOUT);
    };
}

// Форматирование времени в читаемый вид
export function formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

// Получить отображаемое название провайдера
// Провайдеры: laozhang, kieai, wavespeed
export function getProviderDisplayName(provider: string): string {
    const providerNames: Record<string, string> = {
        laozhang: "LaoZhang",
        kieai: "Kie.ai",
        wavespeed: "Wavespeed",
    };
    return providerNames[provider] || provider;
}

// Вспомогательные функции для работы с data URL

// Получить MIME type из data URL
export function getMimeTypeFromDataUrl(dataUrl: string): string {
    const match = dataUrl.match(/^data:([^;]+)/);
    return match ? match[1] : "image/png";
}

// Проверить, является ли data URL видео
export function isVideoDataUrl(dataUrl: string): boolean {
    const mimeType = getMimeTypeFromDataUrl(dataUrl);
    return mimeType.startsWith("video/");
}

// fastpic и др. возвращают URL страницы (.html), а не прямую ссылку на изображение
// Для img src нужна прямая ссылка — убираем .html
export function toDirectImageUrl(url: string): string {
    if (!url || typeof url !== "string") return url;
    if (
        url.endsWith(".html") &&
        /\.(png|jpg|jpeg|gif|webp)\.html$/i.test(url)
    ) {
        return url.slice(0, -5);
    }
    return url;
}
