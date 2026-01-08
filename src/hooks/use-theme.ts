import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'theme';

function getClientTheme(): Theme {
    if (typeof window === 'undefined') return 'light';
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    if (stored === 'dark' || stored === 'light') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
}

export function useTheme() {
    // Используем одинаковое начальное значение на сервере и клиенте
    // Это предотвращает несоответствие гидратации
    const [theme, setTheme] = useState<Theme>(() => {
        // На сервере всегда возвращаем 'light'
        if (typeof window === 'undefined') return 'light';
        // На клиенте читаем из localStorage или определяем по предпочтениям
        return getClientTheme();
    });
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        // Применяем тему сразу после монтирования
        applyTheme(theme);
    }, []);

    useEffect(() => {
        if (isMounted) {
            applyTheme(theme);
            localStorage.setItem(THEME_STORAGE_KEY, theme);
        }
    }, [theme, isMounted]);

    function applyTheme(theme: Theme) {
        if (typeof window === 'undefined') return;
        const root = document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
            return;
        }
        root.classList.remove('dark');
    }

    function toggleTheme() {
        setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
    }

    function setLightTheme() {
        setTheme('light');
    }

    function setDarkTheme() {
        setTheme('dark');
    }

    return {
        theme,
        toggleTheme,
        setLightTheme,
        setDarkTheme,
        isDarkTheme: theme === 'dark',
        isMounted, // Экспортируем для компонентов, которые нуждаются в проверке монтирования
    };
}
