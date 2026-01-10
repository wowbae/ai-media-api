// Утилита для работы с настройками генерации медиа в localStorage

const STORAGE_KEY = "ai-media-settings";

export interface MediaSettings {
  format?: "1:1" | "4:3" | "3:4" | "9:16" | "16:9" | "2:3" | "3:2" | "21:9";
  quality?: "1k" | "2k" | "4k";
  videoFormat?: "16:9" | "9:16"; // Формат видео для Veo
  klingAspectRatio?: "16:9" | "9:16"; // Формат видео для Kling 2.6
  klingDuration?: 5 | 10; // Длительность видео для Kling 2.6
  klingSound?: boolean; // Звук для Kling 2.6
}

// Загрузить настройки из localStorage
export function loadMediaSettings(): MediaSettings {
  if (typeof window === "undefined") {
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
        klingAspectRatio: parsed.klingAspectRatio,
        klingDuration: parsed.klingDuration,
        klingSound: parsed.klingSound,
      };
    }
  } catch (error) {
    console.error("Ошибка загрузки настроек из localStorage:", error);
  }

  return {};
}

// Сохранить настройки в localStorage
export function saveMediaSettings(settings: MediaSettings): void {
  if (typeof window === "undefined") {
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
    console.error("Ошибка сохранения настроек в localStorage:", error);
  }
}

// Очистить настройки
export function clearMediaSettings(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Ошибка очистки настроек из localStorage:", error);
  }
}
