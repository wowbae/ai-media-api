// Утилиты для работы с моделями медиа-генерации
import type { MediaModel, MediaProviderType } from '../config';
import { MEDIA_MODELS, type MediaModelConfig } from '../config';

/**
 * Получить провайдера модели
 */
export function getModelProvider(model: MediaModel): MediaProviderType | undefined {
    return MEDIA_MODELS[model]?.provider;
}

/**
 * Проверить, является ли модель одной из указанных
 */
export function isModel(model: string, ...models: MediaModel[]): boolean {
    return models.includes(model as MediaModel);
}

/**
 * Получить конфигурацию модели
 */
export function getModelConfig(model: MediaModel): MediaModelConfig | undefined {
    return MEDIA_MODELS[model];
}

/**
 * Проверить, поддерживает ли модель входные изображения
 */
export function supportsImageInput(model: MediaModel): boolean {
    return MEDIA_MODELS[model]?.supportsImageInput ?? false;
}

/**
 * Получить максимальную длину промпта для модели
 */
export function getMaxPromptLength(model: MediaModel): number {
    return MEDIA_MODELS[model]?.maxPromptLength ?? 0;
}
