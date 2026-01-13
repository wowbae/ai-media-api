// Утилиты для работы с моделями медиа-генерации
// Названия моделей получаем из API через useGetModelsQuery()

import type { ModelInfo } from '@/redux/api/base';

// Маппинг моделей на их иконки (эмодзи)
const MODEL_ICONS: Record<string, string> = {
    NANO_BANANA_OPENROUTER: '🍌',
    MIDJOURNEY: '🎨',
    VEO_3_1_FAST_KIEAI: '🎥',
    NANO_BANANA_PRO_LAOZHANG: '🍌',
    SORA_2: '🌊',
    VEO_3_1_KIEAI: '🎥',
    KLING_2_6_KIEAI: '🎬',
    KLING_2_5_TURBO_PRO_KIEAI: '🎬',
    IMAGEN4_KIEAI: '🖼️',
    IMAGEN4_ULTRA_KIEAI: '💎',
    SEEDREAM_4_5_KIEAI: '🌌',
    SEEDREAM_4_5_EDIT_KIEAI: '🪄',
    ELEVENLABS_MULTILINGUAL_V2_KIEAI: '🎤',
};

const DEFAULT_ICON = '✨';

// Получить иконку (эмодзи) для модели
export function getModelIcon(model: string): string {
    return MODEL_ICONS[model] || DEFAULT_ICON;
}

// Функция сравнения для сортировки моделей
// Приоритет: kieai провайдер, затем по имени
function compareModels(a: ModelInfo, b: ModelInfo): number {
    if (a.provider === 'kieai' && b.provider !== 'kieai') return -1;
    if (a.provider !== 'kieai' && b.provider === 'kieai') return 1;
    return a.name.localeCompare(b.name);
}

// Сортировать модели по типу с приоритетом kieai провайдера
export function sortModelsByType(
    models: ModelInfo[] | undefined,
    type: 'IMAGE' | 'VIDEO' | 'AUDIO'
): ModelInfo[] {
    if (!models) return [];
    const filtered = models.filter((model) => model.types.includes(type));
    return filtered.sort(compareModels);
}

// Группировать модели по типам с сортировкой
export function groupModelsByType(
    models: ModelInfo[] | undefined
): {
    imageModels: ModelInfo[];
    videoModels: ModelInfo[];
    audioModels: ModelInfo[];
} {
    if (!models) {
        return {
            imageModels: [],
            videoModels: [],
            audioModels: [],
        };
    }

    return {
        imageModels: sortModelsByType(models, 'IMAGE'),
        videoModels: sortModelsByType(models, 'VIDEO'),
        audioModels: sortModelsByType(models, 'AUDIO'),
    };
}
