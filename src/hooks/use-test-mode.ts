// Хук для работы с тестовым режимом медиа-генерации
import { useState, useEffect } from 'react';
import { loadTestMode, saveTestMode } from '@/lib/test-mode';

interface UseTestModeReturn {
    isTestMode: boolean;
    setTestMode: (enabled: boolean) => void;
    toggleTestMode: () => void;
}

// Хук для отслеживания и управления тестовым режимом
export function useTestMode(): UseTestModeReturn {
    const [isTestMode, setIsTestMode] = useState(false);

    // Загружаем начальное состояние
    useEffect(() => {
        setIsTestMode(loadTestMode());
    }, []);

    // Слушаем изменения в localStorage (для синхронизации между вкладками)
    useEffect(() => {
        function handleStorageChange(e: StorageEvent) {
            if (e.key === 'ai-media-test-mode') {
                setIsTestMode(loadTestMode());
            }
        }

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    // Периодическая проверка для синхронизации в той же вкладке
    // Увеличен интервал с 1 до 3 секунд для снижения нагрузки на память
    useEffect(() => {
        const interval = setInterval(() => {
            const currentTestMode = loadTestMode();
            setIsTestMode((prev) => {
                if (prev !== currentTestMode) {
                    return currentTestMode;
                }
                return prev;
            });
        }, 3000); // Увеличено с 1000ms до 3000ms для экономии ресурсов

        return () => clearInterval(interval);
    }, []);

    function setTestMode(enabled: boolean) {
        saveTestMode(enabled);
        setIsTestMode(enabled);
    }

    function toggleTestMode() {
        setTestMode(!isTestMode);
    }

    return {
        isTestMode,
        setTestMode,
        toggleTestMode,
    };
}
