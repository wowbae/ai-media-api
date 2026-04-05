// Утилита для работы с тестовым режимом в localStorage

const TEST_MODE_KEY = 'ai-media-test-mode';

// Загрузить состояние тестового режима
export function loadTestMode(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    try {
        const stored = localStorage.getItem(TEST_MODE_KEY);
        if (stored !== null) {
            return JSON.parse(stored) as boolean;
        }
    } catch (error) {
        console.error('Ошибка загрузки состояния тестового режима:', error);
    }

    return false;
}

// Сохранить состояние тестового режима
export function saveTestMode(enabled: boolean): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        localStorage.setItem(TEST_MODE_KEY, JSON.stringify(enabled));
    } catch (error) {
        console.error('Ошибка сохранения состояния тестового режима:', error);
    }
}
