import { useEffect, useState } from 'react';

type Theme = 'dark';

const THEME_STORAGE_KEY = 'theme';

function getClientTheme(): Theme {
    // Всегда возвращаем dark тему
    if (typeof window === 'undefined') return 'dark';
    // Проверяем сохраненную тему, но только dark
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'dark' ? 'dark' : 'dark';
}

export function useTheme() {
    // Используем одинаковое начальное значение на сервере и клиенте
    // Это предотвращает несоответствие гидратации
    const [theme, setTheme] = useState<Theme>(() => {
        // Всегда возвращаем 'dark'
        if (typeof window === 'undefined') return 'dark';
        // На клиенте всегда dark
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
        // Всегда применяем dark тему
        root.classList.add('dark');
    }

    function setDarkTheme() {
        setTheme('dark');
    }

    return {
        theme,
        setDarkTheme,
        isDarkTheme: true, // Всегда true, так как только dark тема
        isMounted, // Экспортируем для компонентов, которые нуждаются в проверке монтирования
    };
}
