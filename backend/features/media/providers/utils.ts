// Общие утилиты для провайдеров медиа-генерации
import type { GenerateParams } from './interfaces';

/**
 * Стандартизированные значения качества
 */
export type StandardQuality = '1k' | '2k' | '4k';

/**
 * Маппит качество из GenerateParams в стандартные значения 1k/2k/4k
 * Используется всеми провайдерами как базовый слой маппинга
 */
export function mapToStandardQuality(
    quality: GenerateParams['quality']
): StandardQuality | undefined {
    if (!quality) return undefined;

    // Если уже стандартное значение - возвращаем как есть
    if (quality === '1k' || quality === '2k' || quality === '4k') {
        return quality;
    }

    // Маппинг LOW/MEDIUM/HIGH/ULTRA на стандартные значения
    const mapping: Record<string, StandardQuality> = {
        LOW: '1k',
        MEDIUM: '2k',
        HIGH: '4k',
        ULTRA: '4k',
    };

    return mapping[quality] || undefined;
}
