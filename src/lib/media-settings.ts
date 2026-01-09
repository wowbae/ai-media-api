// Утилита для работы с настройками генерации медиа в localStorage

const STORAGE_KEY = 'ai-media-settings';

export interface MediaSettings {
    format?: '9:16' | '16:9';
    quality?: '1k' | '2k' | '4k';
    videoFormat?: '16:9' | '9:16'; // Формат видео для Veo
}

// Загрузить настройки из localStorage
export function loadMediaSettings(): MediaSettings {
    if (typeof window === 'undefined') {
        return {};
    }

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored) as MediaSettings;
            return {
                format: parsed.format,
                quality: parsed.quality,
                videoFormat: parsed.videoFormat,
            };
        }
    } catch (error) {
        console.error('Ошибка загрузки настроек из localStorage:', error);
    }

    return {};
}

// Сохранить настройки в localStorage
export function saveMediaSettings(settings: MediaSettings): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        const current = loadMediaSettings();
        const updated: MediaSettings = {
            ...current,
            ...settings,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
        console.error('Ошибка сохранения настроек в localStorage:', error);
    }
}

// Очистить настройки
export function clearMediaSettings(): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.error('Ошибка очистки настроек из localStorage:', error);
    }
}
