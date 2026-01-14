import { MEDIA_MODELS, MEDIA_MODEL_KEYS, type MediaModel } from './config';
import { convertUsdToTokens, DEFAULT_TARIFF_ID } from './tariff';

const MARKUP = 1.4; // 40% прибыль

// Себестоимость (USD) из прежнего cost-utils.ts
const BASE_COSTS: Partial<Record<MediaModel, number>> = {
    NANO_BANANA_OPENROUTER: 0.05,
    NANO_BANANA_PRO_KIEAI: 0.09,
    NANO_BANANA_PRO_LAOZHANG: 0.05,
    IMAGEN4_KIEAI: 0.02,
    IMAGEN4_ULTRA_KIEAI: 0.06,
    SEEDREAM_4_5_KIEAI: 0.0325,
    SEEDREAM_4_5_EDIT_KIEAI: 0.0325,
    KLING_2_5_TURBO_PRO_KIEAI: 0.42,
    KLING_2_6_KIEAI: 0.55,
    VEO_3_1_FAST_KIEAI: 0.3,
    VEO_3_1_KIEAI: 1.25,
    ELEVENLABS_MULTILINGUAL_V2_KIEAI: 0.05,
    MIDJOURNEY: 0.5,
    SORA_2: 0.3,
    SORA: 0.3,
};

export type PricingEntry = {
    costPrice: number; // себестоимость, USD
    finalPrice: number; // итоговая цена с наценкой, USD
    tokens: number; // стоимость в токенах по тарифу
};

export const pricing: Record<MediaModel, PricingEntry> = MEDIA_MODEL_KEYS.reduce(
    (acc, model) => {
        const costPrice =
            BASE_COSTS[model] ??
            MEDIA_MODELS[model]?.pricing?.output ??
            0;
        const finalPrice = Number((costPrice * MARKUP).toFixed(4));
        acc[model] = {
            costPrice,
            finalPrice,
            tokens: convertUsdToTokens(finalPrice, DEFAULT_TARIFF_ID),
        };
        return acc;
    },
    {} as Record<MediaModel, PricingEntry>
);

export function getModelPricing(model: MediaModel): PricingEntry | undefined {
    return pricing[model];
}
