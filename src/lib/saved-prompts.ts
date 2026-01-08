// Утилита для работы с сохраненными промптами и изображениями в localStorage

const SAVED_PROMPTS_KEY = 'ai-media-saved-prompts';
const LOCK_BUTTON_STATE_KEY = 'ai-media-lock-button-enabled';

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

// Загрузить все сохраненные промпты
export function loadSavedPrompts(): SavedPrompt[] {
    if (typeof window === 'undefined') {
        return [];
    }

    try {
        const stored = localStorage.getItem(SAVED_PROMPTS_KEY);
        if (stored) {
            return JSON.parse(stored) as SavedPrompt[];
        }
    } catch (error) {
        console.error('Ошибка загрузки сохраненных промптов:', error);
    }

    return [];
}

// Сохранить промпт и изображения
export function savePrompt(
    prompt: string,
    images: string[],
    chatId: number,
    model: string
): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        const savedPrompts = loadSavedPrompts();
        const newPrompt: SavedPrompt = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            prompt,
            images,
            timestamp: Date.now(),
            chatId,
            model,
        };

        savedPrompts.push(newPrompt);
        localStorage.setItem(SAVED_PROMPTS_KEY, JSON.stringify(savedPrompts));
    } catch (error) {
        console.error('Ошибка сохранения промпта:', error);
    }
}

// Удалить сохраненный промпт
export function removeSavedPrompt(id: string): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        const savedPrompts = loadSavedPrompts();
        const filtered = savedPrompts.filter((p) => p.id !== id);
        localStorage.setItem(SAVED_PROMPTS_KEY, JSON.stringify(filtered));
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
