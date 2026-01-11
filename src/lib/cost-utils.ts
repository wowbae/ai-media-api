import { type MediaRequest, type MediaModel } from '@/redux/media-api';

/**
 * Тарифы для разных моделей (стоимость за одну генерацию)
 * Эти значения можно легко корректировать здесь.
 */
export const MODEL_RATES: Record<MediaModel, number> = {
    'NANO_BANANA_OPENROUTER': 0.05,
    'MIDJOURNEY': 0.5,
    'VEO_3_1_FAST': 0.7,
    'NANO_BANANA_PRO_LAOZHANG': 0.1,
    'SORA_2': 2.5,
    'VEO_3_1': 1.2,
    'KLING_2_6': 1.0,
    'KLING_2_5_TURBO_PRO': 0.8,
    'NANO_BANANA_PRO_KIEAI': 0.15,
    'IMAGEN4_KIEAI': 0.3,
    'IMAGEN4_ULTRA_KIEAI': 0.4,
    'SEEDREAM_4_5': 0.35,
    'SEEDREAM_4_5_EDIT': 0.25,
    'ELEVENLABS_MULTILINGUAL_V2': 0.05,
};

/**
 * Вычисляет стоимость конкретного запроса
 */
export function calculateRequestCost(request: MediaRequest): number {
    if (!request.model || request.status === 'FAILED') {
        return 0;
    }

    const rate = MODEL_RATES[request.model] || 0;

    // Здесь можно добавить более сложную логику, например, зависимость от duration
    // if (request.settings?.duration && typeof request.settings.duration === 'number') {
    //     return rate * (request.settings.duration / 10);
    // }

    return rate;
}

/**
 * Вычисляет суммарную стоимость всех запросов в списке
 */
export function calculateTotalChatCost(requests: MediaRequest[]): number {
    return requests.reduce((total, request) => {
        return total + calculateRequestCost(request);
    }, 0);
}

/**
 * Форматирует стоимость для отображения
 */
export function formatCost(cost: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
    }).format(cost);
}
