// Утилиты для работы с моделями медиа-генерации
// Названия моделей получаем из API через useGetModelsQuery()

import type { ModelInfo } from "@/redux/api/base";

// Маппинг моделей на их иконки (эмодзи)
const MODEL_ICONS: Record<string, string> = {
    NANO_BANANA_PRO_KIEAI: "🍌",
    NANO_BANANA_2_KIEAI: "🍌",
    GROK_IMAGINE_IMAGE_TO_IMAGE_KIEAI: "🧠",
    GROK_IMAGINE_IMAGE_TO_VIDEO_KIEAI: "🧠",
    MIDJOURNEY: "🎨",
    VEO_3_1_FAST_KIEAI: "🎥",
    NANO_BANANA_PRO_LAOZHANG: "🍌",
    KLING_2_6_KIEAI: "🎬",
    KLING_3_0_KIEAI: "🎬",
    IMAGEN4_KIEAI: "🖼️",
    IMAGEN4_ULTRA_KIEAI: "💎",
    SEEDREAM_4_5_KIEAI: "🌌",
    SEEDREAM_4_5_EDIT_KIEAI: "🪄",
    SEEDREAM_5_0_LITE_KIEAI: "🌟",
    SEEDREAM_5_0_LITE_EDIT_KIEAI: "✨",
    ELEVENLABS_MULTILINGUAL_V2_KIEAI: "🎤",
    KLING_VIDEO_O1_WAVESPEED: "🎥",
    Z_IMAGE_TURBO_LORA_WAVESPEED: "🖼️",
    Z_IMAGE_TURBO_IMAGE_TO_IMAGE_WAVESPEED: "🖼️",
    Z_IMAGE_LORA_TRAINER_WAVESPEED: "🧪",
    QWEN_IMAGE_2_0_PRO_EDIT_WAVESPEED: "🖼️",
    SEEDREAM_V4_5_EDIT_SEQUENTIAL_WAVESPEED: "🪄",
    KLING_2_6_MOTION_CONTROL_KIEAI: "🔄",
};

const DEFAULT_ICON = "✨";

// Получить иконку (эмодзи) для модели
export function getModelIcon(model: string): string {
    return MODEL_ICONS[model] || DEFAULT_ICON;
}

// Функция сравнения для сортировки моделей
// Приоритет: kieai провайдер, затем по имени
function compareModels(a: ModelInfo, b: ModelInfo): number {
    if (a.provider === "kieai" && b.provider !== "kieai") return -1;
    if (a.provider !== "kieai" && b.provider === "kieai") return 1;
    return a.name.localeCompare(b.name);
}

// Сортировать модели по типу с приоритетом kieai провайдера
export function sortModelsByType(
    models: ModelInfo[] | undefined,
    type: "IMAGE" | "VIDEO" | "AUDIO",
): ModelInfo[] {
    if (!models) return [];
    const filtered = models.filter((model) => model.types.includes(type));
    return filtered.sort(compareModels);
}

// Группировать модели по типам с сортировкой
export function groupModelsByType(models: ModelInfo[] | undefined): {
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
        imageModels: sortModelsByType(models, "IMAGE"),
        videoModels: sortModelsByType(models, "VIDEO"),
        audioModels: sortModelsByType(models, "AUDIO"),
    };
}
