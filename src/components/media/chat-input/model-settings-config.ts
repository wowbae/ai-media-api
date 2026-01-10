// Конфигурация настроек для каждой модели
import type { MediaModel } from '@/redux/api/base';

export interface FormatOption {
    value: string;
    label: string;
}

export interface QualityOption {
    value: '1k' | '2k' | '4k' | 'default';
    label: string;
}

export interface DurationOption {
    value: '5' | '10';
    label: string;
}

export interface SoundOption {
    value: 'true' | 'false';
    label: string;
}

export interface FormatConfig {
    options: FormatOption[];
    defaultValue?: '1:1' | '16:9' | '9:16';
    allowDefault?: boolean; // Показывать опцию "По умолчанию"
}

export interface QualityConfig {
    options: QualityOption[];
    defaultValue?: '1k' | '2k' | '4k';
    allowDefault?: boolean;
}

export interface DurationConfig {
    options: DurationOption[];
    defaultValue: 5 | 10;
}

export interface SoundConfig {
    options: SoundOption[];
    defaultValue: boolean;
}

export interface ModelSettingConfig {
    format?: FormatConfig;
    quality?: QualityConfig;
    duration?: DurationConfig;
    sound?: SoundConfig;
}

// Общие опции для форматов
const FORMAT_OPTIONS_1_1_16_9_9_16: FormatOption[] = [
    { value: '1:1', label: '1:1 (Квадрат)' },
    { value: '16:9', label: '16:9 (Горизонтальный)' },
    { value: '9:16', label: '9:16 (Вертикальный)' },
];

const FORMAT_OPTIONS_16_9_9_16: FormatOption[] = [
    { value: '16:9', label: '16:9 (Горизонтальный)' },
    { value: '9:16', label: '9:16 (Вертикальный)' },
];

const FORMAT_OPTIONS_WITH_DEFAULT: FormatOption[] = [
    { value: 'default', label: 'По умолчанию' },
    { value: '16:9', label: '16:9 (Горизонтальный)' },
    { value: '9:16', label: '9:16 (Вертикальный)' },
];

// Общие опции для качества
const QUALITY_OPTIONS_1K_2K_4K: QualityOption[] = [
    { value: '1k', label: '1K' },
    { value: '2k', label: '2K' },
    { value: '4k', label: '4K' },
];

const QUALITY_OPTIONS_2K_4K: QualityOption[] = [
    { value: '2k', label: '2K' },
    { value: '4k', label: '4K' },
];

const QUALITY_OPTIONS_WITH_DEFAULT: QualityOption[] = [
    { value: 'default', label: 'По умолчанию' },
    { value: '1k', label: '1K' },
    { value: '2k', label: '2K' },
    { value: '4k', label: '4K' },
];

// Опции для длительности
const DURATION_OPTIONS: DurationOption[] = [
    { value: '5', label: '5 сек' },
    { value: '10', label: '10 сек' },
];

// Опции для звука
const SOUND_OPTIONS: SoundOption[] = [
    { value: 'true', label: 'звук on' },
    { value: 'false', label: 'звук off' },
];

// Конфигурация настроек для всех моделей
export const MODEL_SETTINGS_CONFIG: Record<MediaModel, ModelSettingConfig> = {
    NANO_BANANA: {
        format: {
            options: FORMAT_OPTIONS_WITH_DEFAULT,
            allowDefault: true,
        },
        quality: {
            options: QUALITY_OPTIONS_WITH_DEFAULT,
            allowDefault: true,
        },
    },
    NANO_BANANA_PRO: {
        format: {
            options: FORMAT_OPTIONS_16_9_9_16,
            defaultValue: '9:16',
        },
        quality: {
            options: QUALITY_OPTIONS_2K_4K,
            defaultValue: '2k',
        },
    },
    NANO_BANANA_PRO_KIEAI: {
        format: {
            options: FORMAT_OPTIONS_1_1_16_9_9_16,
            defaultValue: '9:16',
        },
        quality: {
            options: QUALITY_OPTIONS_1K_2K_4K,
            defaultValue: '2k',
        },
    },
    IMAGEN4_KIEAI: {
        format: {
            options: FORMAT_OPTIONS_1_1_16_9_9_16,
            defaultValue: '9:16',
        },
    },
    VEO_3_1_FAST: {
        format: {
            options: FORMAT_OPTIONS_WITH_DEFAULT,
            allowDefault: true,
        },
    },
    VEO_3_1: {
        format: {
            options: FORMAT_OPTIONS_WITH_DEFAULT,
            allowDefault: true,
        },
    },
    KLING_2_6: {
        format: {
            options: FORMAT_OPTIONS_16_9_9_16,
            defaultValue: '9:16',
        },
        duration: {
            options: DURATION_OPTIONS,
            defaultValue: 5,
        },
        sound: {
            options: SOUND_OPTIONS,
            defaultValue: false,
        },
    },
    KLING_2_5_TURBO_PRO: {
        format: {
            options: FORMAT_OPTIONS_16_9_9_16,
            defaultValue: '9:16',
        },
        duration: {
            options: DURATION_OPTIONS,
            defaultValue: 5,
        },
    },
    MIDJOURNEY: {},
    SORA_2: {},
};

// Получить конфигурацию для модели
export function getModelSettingsConfig(
    model: MediaModel
): ModelSettingConfig {
    return MODEL_SETTINGS_CONFIG[model] || {};
}
