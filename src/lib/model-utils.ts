// Утилиты для работы с моделями медиа-генерации
import type { MediaModel } from '@/redux/media-api';

// Маппинг моделей на их иконки (эмодзи)
const MODEL_ICONS: Record<string, string> = {
    NANO_BANANA: '🍌',
    KLING: '🎬',
    MIDJOURNEY: '🎨',
    VEO_3_1_FAST: '🎥',
};

const DEFAULT_ICON = '✨';

// Получить иконку (эмодзи) для модели
export function getModelIcon(model: string | MediaModel): string {
    return MODEL_ICONS[model] || DEFAULT_ICON;
}

// Маппинг моделей на их отображаемые имена
const MODEL_NAMES: Record<string, string> = {
    NANO_BANANA: 'Nano Banana 2 Pro',
    KLING: 'Kling AI Video',
    MIDJOURNEY: 'Midjourney',
    VEO_3_1_FAST: 'Veo 3.1 Fast',
};

// Получить отображаемое имя модели
export function getModelName(model: string | MediaModel): string {
    return MODEL_NAMES[model] || model;
}
