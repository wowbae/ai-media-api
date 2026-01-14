import { type MediaRequest } from '@/redux/media-api';

/**
 * Вычисляет стоимость конкретного запроса
 */
export function calculateRequestCost(request: MediaRequest): number {
    if (request.status === 'FAILED') {
        return 0;
    }

    // Основной источник истины — стоимость, сохранённая на сервере в costUsd
    if (typeof request.costUsd === 'number' && !Number.isNaN(request.costUsd)) {
        return request.costUsd;
    }

    // На случай старых записей без стоимости в БД возвращаем 0,
    // чтобы не показывать некорректные данные.
    return 0;
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
