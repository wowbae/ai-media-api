import { type MediaRequest, type PricingMap } from '@/redux/media-api';

/**
 * Вычисляет стоимость конкретного запроса
 */
export function calculateRequestCost(
    request: MediaRequest,
    pricingMap?: PricingMap
): number {
    if (request.status === 'FAILED') {
        return 0;
    }

    // Основной источник истины — стоимость, сохранённая на сервере в costUsd
    if (typeof request.costUsd === 'number' && !Number.isNaN(request.costUsd)) {
        return request.costUsd;
    }

    // Fallback для старых записей без costUsd:
    // используем актуальную цену из карты pricing, если она есть.
    if (pricingMap && request.model) {
        const pricing = pricingMap[request.model];
        if (pricing && typeof pricing.usd === 'number') {
            return pricing.usd;
        }
    }

    // На случай полностью отсутствующих данных возвращаем 0,
    // чтобы не показывать некорректные значения.
    return 0;
}

/**
 * Вычисляет суммарную стоимость всех запросов в списке
 */
export function calculateTotalChatCost(
    requests: MediaRequest[],
    pricingMap?: PricingMap
): number {
    return requests.reduce((total, request) => {
        return total + calculateRequestCost(request, pricingMap);
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
