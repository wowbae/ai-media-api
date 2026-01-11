// Хук для работы с типом модели на основе конфигурации
import { useMemo } from 'react';
import type { MediaModel } from '@/redux/api/base';
import { getModelConfig, type ModelConfig } from '@/lib/model-config';

export interface UseModelTypeReturn extends ModelConfig {
    model: MediaModel;
}

/**
 * Хук для получения всех флагов и свойств модели
 * @param model - Модель медиа-генерации
 * @returns Объект с флагами и свойствами модели
 */
export function useModelType(model: MediaModel): UseModelTypeReturn {
    return useMemo(() => {
        const config = getModelConfig(model);
        return {
            model,
            ...config,
        };
    }, [model]);
}
