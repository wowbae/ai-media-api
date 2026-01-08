// Утилита для работы с сохраненными промптами и изображениями в localStorage

const SAVED_PROMPTS_KEY = 'ai-media-saved-prompts';
const LOCK_BUTTON_STATE_KEY = 'ai-media-lock-button-enabled';

// Лимиты для предотвращения переполнения localStorage
const MAX_IMAGES_PER_PROMPT = 3;
const MAX_IMAGE_SIZE = 500_000; // ~500KB в base64 (больше места, т.к. только один промпт)

export interface SavedPrompt {
    id: string;
    prompt: string;
    images: string[]; // base64 строки
    timestamp: number;
    chatId: number;
    model: string;
}

// Загрузить состояние кнопки замочка
export function loadLockButtonState(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    try {
        const stored = localStorage.getItem(LOCK_BUTTON_STATE_KEY);
        if (stored !== null) {
            return JSON.parse(stored) as boolean;
        }
    } catch (error) {
        console.error('Ошибка загрузки состояния кнопки замочка:', error);
    }

    return false;
}

// Сохранить состояние кнопки замочка
export function saveLockButtonState(enabled: boolean): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        localStorage.setItem(LOCK_BUTTON_STATE_KEY, JSON.stringify(enabled));
    } catch (error) {
        console.error('Ошибка сохранения состояния кнопки замочка:', error);
    }
}

// Загрузить последний сохраненный промпт
export function loadLastSavedPrompt(): SavedPrompt | null {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const stored = localStorage.getItem(SAVED_PROMPTS_KEY);
        if (stored) {
            return JSON.parse(stored) as SavedPrompt;
        }
    } catch (error) {
        console.error('Ошибка загрузки сохраненного промпта:', error);
        // Если ошибка - очищаем испорченные данные
        localStorage.removeItem(SAVED_PROMPTS_KEY);
    }

    return null;
}

// Загрузить все сохраненные промпты (для обратной совместимости, возвращает массив из одного элемента)
export function loadSavedPrompts(): SavedPrompt[] {
    const lastPrompt = loadLastSavedPrompt();
    return lastPrompt ? [lastPrompt] : [];
}

// Сохранить промпт и изображения (перезаписывает предыдущий)
export function savePrompt(
    prompt: string,
    images: string[],
    chatId: number,
    model: string
): void {
    if (typeof window === 'undefined') return;

    try {
        // Фильтруем изображения: только первые N и не слишком большие
        const filteredImages = images
            .slice(0, MAX_IMAGES_PER_PROMPT)
            .filter((img) => img.length <= MAX_IMAGE_SIZE);

        const newPrompt: SavedPrompt = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            prompt,
            images: filteredImages,
            timestamp: Date.now(),
            chatId,
            model,
        };

        // Перезаписываем предыдущий промпт - сохраняем только последний
        localStorage.setItem(SAVED_PROMPTS_KEY, JSON.stringify(newPrompt));
    } catch (error) {
        // QuotaExceededError - очищаем и пробуем сохранить без изображений
        if (
            error instanceof DOMException &&
            error.name === 'QuotaExceededError'
        ) {
            console.warn(
                'localStorage переполнен, сохраняем промпт без изображений...'
            );
            try {
                const promptWithoutImages: SavedPrompt = {
                    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    prompt,
                    images: [],
                    timestamp: Date.now(),
                    chatId,
                    model,
                };
                localStorage.setItem(
                    SAVED_PROMPTS_KEY,
                    JSON.stringify(promptWithoutImages)
                );
            } catch {
                // Если даже без изображений не помещается - просто очищаем
                localStorage.removeItem(SAVED_PROMPTS_KEY);
            }
        } else {
            console.error('Ошибка сохранения промпта:', error);
        }
    }
}

// Удалить сохраненный промпт (просто очищает, т.к. хранится только один)
export function removeSavedPrompt(id: string): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        const lastPrompt = loadLastSavedPrompt();
        // Если id совпадает - удаляем
        if (lastPrompt?.id === id) {
            localStorage.removeItem(SAVED_PROMPTS_KEY);
        }
    } catch (error) {
        console.error('Ошибка удаления промпта:', error);
    }
}

// Очистить все сохраненные промпты
export function clearSavedPrompts(): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        localStorage.removeItem(SAVED_PROMPTS_KEY);
    } catch (error) {
        console.error('Ошибка очистки сохраненных промптов:', error);
    }
}
