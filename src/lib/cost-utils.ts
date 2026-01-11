import { type MediaRequest, type MediaModel } from '@/redux/media-api';

/**
 * Тарифы для разных моделей (стоимость за одну генерацию)
 * Эти значения можно легко корректировать здесь.
 */
export const MODEL_RATES: Record<MediaModel, number> = {
    'NANO_BANANA_OPENROUTER': 0.05,
    'NANO_BANANA_PRO_KIEAI': 0.09,
    'NANO_BANANA_PRO_LAOZHANG': 0.05,
    'IMAGEN4_KIEAI': 0.02,
    'IMAGEN4_ULTRA_KIEAI': 0.06,
    'SEEDREAM_4_5': 0.0325,
    'SEEDREAM_4_5_EDIT': 0.0325,
    'KLING_2_5_TURBO_PRO': 0.42,
    'KLING_2_6': 0.55,
    'VEO_3_1_FAST': 0.3, // kie.ai
    'VEO_3_1': 1.25,
    'ELEVENLABS_MULTILINGUAL_V2': 0.05,
    'MIDJOURNEY': 0.5,
    'SORA_2': 0.3,
};



// OpenRouter
// - banana pro - 11₽

// Laozhang (https://api.laozhang.ai)
// - nano banana pro - 4.8₽ ($0.05 за изображение = 3.9р)
// - sora 2 - 14₽ ($0.30 за видео 540p, 10s)
// - veo 3.1 - ~50₽ ($0.50 за видео 720p, async)

// Kie.ai
// - nano banana pro - 24 кредита = 9.46р (было указано $0.09 = 7р)
// - imagen4 		  - 4 кредита - $0.02
// - Imagen 4 Ultra  - 12 кредитов - $0.06

// - kling 2.6 		  - 110 кредитов за 10 секунд - $0.55 = 43 р
// - kling 2.5 turbo pro - 84 кредита за 10 секунд - $0.42 = 33р

// - seedream 4.5		  - 6.5 кредитов = $0.0325 = 2.54р


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
