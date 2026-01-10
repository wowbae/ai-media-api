// Утилиты для работы с моделями медиа-генерации
// Названия моделей получаем из API через useGetModelsQuery()

// Маппинг моделей на их иконки (эмодзи)
const MODEL_ICONS: Record<string, string> = {
    NANO_BANANA: '🍌',
    MIDJOURNEY: '🎨',
    VEO_3_1_FAST: '🎥',
    NANO_BANANA_PRO: '🍌',
    SORA_2: '🌊',
    VEO_3_1: '🎥',
    KLING_2_6: '🎬',
    KLING_2_5_TURBO_PRO: '🎬',
};

const DEFAULT_ICON = '✨';

// Получить иконку (эмодзи) для модели
export function getModelIcon(model: string): string {
    return MODEL_ICONS[model] || DEFAULT_ICON;
}
