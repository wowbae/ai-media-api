import { z } from 'zod';

export interface Tariff {
    id: string;
    name: string;
    /**
     * Сколько токенов выдаём за $1.
     * Пример: 120 означает 120 токенов за $1.
     */
    usdToTokensRate: number;
}

export const DEFAULT_TARIFF_ID = 'base';

export const tariffs: Tariff[] = [
    {
        id: DEFAULT_TARIFF_ID,
        name: 'Базовый тариф 5$ = 600 токенов',
        usdToTokensRate: 120, // 600 / 5
    },
];

const tariffMap = new Map(tariffs.map((t) => [t.id, t]));

export function convertUsdToTokens(usd: number, tariffId: string = DEFAULT_TARIFF_ID): number {
    const tariff = tariffMap.get(tariffId);
    const rate = tariff?.usdToTokensRate ?? tariffs[0].usdToTokensRate;
    // Округляем вверх, чтобы не недосписать токены.
    return Math.max(0, Math.ceil(usd * rate));
}

export function getTariffById(tariffId: string = DEFAULT_TARIFF_ID): Tariff {
    return tariffMap.get(tariffId) ?? tariffs[0];
}

// Валидация входных данных (может пригодиться для админок)
export const tariffIdSchema = z.string().refine((value) => tariffMap.has(value), {
    message: 'Неизвестный тариф',
});
