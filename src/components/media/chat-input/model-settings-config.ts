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
    value: '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '12';
    label: string;
}

export interface SoundOption {
    value: 'true' | 'false';
    label: string;
}

export interface GenerationTypeOption {
    value: 'TEXT_2_VIDEO' | 'FIRST_AND_LAST_FRAMES_2_VIDEO' | 'REFERENCE_2_VIDEO' | 'EXTEND_VIDEO';
    label: string;
}

export interface GenerationTypeConfig {
    options: GenerationTypeOption[];
    defaultValue?: 'TEXT_2_VIDEO' | 'FIRST_AND_LAST_FRAMES_2_VIDEO' | 'REFERENCE_2_VIDEO' | 'EXTEND_VIDEO';
}

export interface FormatConfig {
    options: FormatOption[];
    defaultValue?: '1:1' | '4:3' | '3:4' | '16:9' | '9:16' | '2:3' | '3:2' | '21:9';
    allowDefault?: boolean; // Показывать опцию "По умолчанию"
}

export interface QualityConfig {
    options: QualityOption[];
    defaultValue?: '1k' | '2k' | '4k';
    allowDefault?: boolean;
}

export interface DurationConfig {
    options: DurationOption[];
    defaultValue: 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 12;
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
    generationType?: GenerationTypeConfig;
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

// Опции форматов для Seedream 4.5 (все поддерживаемые форматы)
const FORMAT_OPTIONS_SEEDREAM: FormatOption[] = [
    { value: '1:1', label: '1:1 (Квадрат)' },
    { value: '4:3', label: '4:3 (Горизонтальный)' },
    { value: '3:4', label: '3:4 (Вертикальный)' },
    { value: '16:9', label: '16:9 (Широкий)' },
    { value: '9:16', label: '9:16 (Высокий)' },
    { value: '2:3', label: '2:3 (Портрет)' },
    { value: '3:2', label: '3:2 (Ландшафт)' },
    { value: '21:9', label: '21:9 (Ультраширокий)' },
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

// Опции качества для Seedream 4.5 (basic = 2K, high = 4K)
const QUALITY_OPTIONS_SEEDREAM: QualityOption[] = [
    { value: '2k', label: 'Basic (2K)' },
    { value: '4k', label: 'High (4K)' },
];

// Опции для длительности
const DURATION_OPTIONS: DurationOption[] = [
    { value: '5', label: '5 сек' },
    { value: '10', label: '10 сек' },
];

// Опции для длительности Wavespeed Kling Video O1 (от 3 до 10 секунд)
const DURATION_OPTIONS_WAVESPEED: DurationOption[] = [
    { value: '3', label: '3 сек' },
    { value: '4', label: '4 сек' },
    { value: '5', label: '5 сек' },
    { value: '6', label: '6 сек' },
    { value: '7', label: '7 сек' },
    { value: '8', label: '8 сек' },
    { value: '9', label: '9 сек' },
    { value: '10', label: '10 сек' },
];

// Опции для длительности Seedance 1.5 Pro (4, 8, 12 секунд)
const DURATION_OPTIONS_SEEDANCE: DurationOption[] = [
    { value: '4', label: '4 сек' },
    { value: '8', label: '8 сек' },
    { value: '12', label: '12 сек' },
];

// Опции для звука
const SOUND_OPTIONS: SoundOption[] = [
    { value: 'true', label: 'звук on' },
    { value: 'false', label: 'звук off' },
];

// Опции для режима генерации Veo 3.1
const GENERATION_TYPE_OPTIONS: GenerationTypeOption[] = [
    { value: 'TEXT_2_VIDEO', label: 'Текст → Видео' },
    { value: 'FIRST_AND_LAST_FRAMES_2_VIDEO', label: 'Кадры → Видео' },
    { value: 'REFERENCE_2_VIDEO', label: 'Референс → Видео' },
    { value: 'EXTEND_VIDEO', label: 'Продление видео' },
];

// Конфигурация настроек для всех моделей (значения по умолчанию прописываем здесь)
export const MODEL_SETTINGS_CONFIG: Record<MediaModel, ModelSettingConfig> = {
    NANO_BANANA_OPENROUTER: {
        format: {
            options: FORMAT_OPTIONS_WITH_DEFAULT,
            allowDefault: true,
        },
        quality: {
            options: QUALITY_OPTIONS_WITH_DEFAULT,
            allowDefault: true,
        },
    },
    NANO_BANANA_PRO_LAOZHANG: {
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
    IMAGEN4_ULTRA_KIEAI: {
        format: {
            options: FORMAT_OPTIONS_1_1_16_9_9_16,
            defaultValue: '9:16',
        },
    },
    VEO_3_1_FAST_KIEAI: {
        format: {
            options: FORMAT_OPTIONS_16_9_9_16,
            defaultValue: '9:16',
        },
        generationType: {
            options: GENERATION_TYPE_OPTIONS,
            defaultValue: 'TEXT_2_VIDEO',
        },
    },
    VEO_3_1_KIEAI: {
        format: {
            options: FORMAT_OPTIONS_16_9_9_16,
            defaultValue: '9:16',
        },
        generationType: {
            options: GENERATION_TYPE_OPTIONS,
            defaultValue: 'TEXT_2_VIDEO',
        },
    },
    KLING_2_6_KIEAI: {
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
    KLING_2_5_TURBO_PRO_KIEAI: {
        format: {
            options: FORMAT_OPTIONS_16_9_9_16,
            defaultValue: '9:16',
        },
        duration: {
            options: DURATION_OPTIONS,
            defaultValue: 5,
        },
    },
    SEEDREAM_4_5_KIEAI: {
        format: {
            options: FORMAT_OPTIONS_SEEDREAM,
            defaultValue: '9:16',
        },
        quality: {
            options: QUALITY_OPTIONS_SEEDREAM,
            defaultValue: '4k', // по цене одинаково с 2к
        },
    },
    SEEDREAM_4_5_EDIT_KIEAI: {
        format: {
            options: FORMAT_OPTIONS_SEEDREAM,
            defaultValue: '9:16',
        },
        quality: {
            options: QUALITY_OPTIONS_SEEDREAM,
            defaultValue: '4k', // по цене одинаково с 2к
        },
    },
    MIDJOURNEY: {},
    SORA_2: {},
    ELEVENLABS_MULTILINGUAL_V2_KIEAI: {}, // Настройки через отдельные поля в UI
    KLING_VIDEO_O1_WAVESPEED: {
        format: {
            options: FORMAT_OPTIONS_16_9_9_16,
            defaultValue: '9:16',
        },
        duration: {
            options: DURATION_OPTIONS_WAVESPEED,
            defaultValue: 5,
        },
    },
    SEEDANCE_1_5_PRO_KIEAI: {
        format: {
            options: FORMAT_OPTIONS_16_9_9_16,
            defaultValue: '9:16',
        },
        duration: {
            options: DURATION_OPTIONS_SEEDANCE,
            defaultValue: 4,
        },
        // generate_audio (звук) для Seedance 1.5 Pro
        sound: {
            options: SOUND_OPTIONS,
            // По умолчанию без звука, как в большинстве видео-моделей
            defaultValue: false,
        },
    },
};

// Получить конфигурацию для модели
export function getModelSettingsConfig(
    model: MediaModel
): ModelSettingConfig {
    return MODEL_SETTINGS_CONFIG[model] || {};
}
