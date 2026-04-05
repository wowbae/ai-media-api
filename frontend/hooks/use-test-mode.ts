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
    // Storage event срабатывает только при изменении из другой вкладки
    // Для синхронизации в той же вкладке используем кастомное событие
    useEffect(() => {
        function handleStorageChange(e: StorageEvent) {
            if (e.key === 'ai-media-test-mode') {
                setIsTestMode(loadTestMode());
            }
        }

        // Кастомное событие для синхронизации в той же вкладке
        function handleCustomStorageChange() {
            setIsTestMode(loadTestMode());
        }

        window.addEventListener('storage', handleStorageChange);
        // Слушаем кастомное событие для синхронизации в той же вкладке
        window.addEventListener('test-mode-changed', handleCustomStorageChange);
        
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('test-mode-changed', handleCustomStorageChange);
        };
    }, []);

    function setTestMode(enabled: boolean) {
        saveTestMode(enabled);
        setIsTestMode(enabled);
        // Отправляем кастомное событие для синхронизации в той же вкладке
        window.dispatchEvent(new Event('test-mode-changed'));
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
