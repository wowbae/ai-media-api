// Конфигурация моделей для генерации медиа
// Единственный источник истины для всех провайдеров
import 'dotenv/config';

export type MediaProviderType = 'openrouter' | 'gptunnel' | 'midjourney';

export interface MediaModelConfig {
    id: string;
    name: string;
    types: readonly ('IMAGE' | 'VIDEO' | 'AUDIO')[];
    maxPromptLength: number;
    supportsImageInput: boolean;
    provider: MediaProviderType;
    pricing?: {
        input?: number; // $ за 1M токенов или за изображение
        output?: number;
    };
}

export const MEDIA_MODELS: Record<string, MediaModelConfig> = {
    NANO_BANANA: {
        id: 'google/gemini-3-pro-image-preview',
        name: 'Nano Banana 2 Pro',
        types: ['IMAGE'] as const,
        maxPromptLength: 8192,
        supportsImageInput: true,
        provider: 'openrouter',
        pricing: {
            input: 0.1,
            output: 0.4,
        },
    },
    KLING: {
        id: 'kling-ai/kling-video',
        name: 'Kling AI',
        types: ['VIDEO'] as const,
        maxPromptLength: 2048,
        supportsImageInput: true,
        provider: 'openrouter',
        pricing: {
            output: 0.04,
        },
    },
    MIDJOURNEY: {
        id: 'midjourney/imagine',
        name: 'Midjourney',
        types: ['IMAGE'] as const,
        maxPromptLength: 4000,
        supportsImageInput: false,
        provider: 'midjourney', // Отдельный провайдер через GPTunnel /midjourney API
        pricing: {
            output: 18,
        },
    },
    VEO_3_1_FAST: {
        id: 'glabs-veo-3-1-fast',
        name: 'Veo 3.1 Fast',
        types: ['VIDEO'] as const,
        maxPromptLength: 4096,
        supportsImageInput: true,
        provider: 'gptunnel',
        pricing: {
            output: 0.1,
        },
    },
};

export type MediaModelKey = keyof typeof MEDIA_MODELS;

// Получить модели по провайдеру
export function getModelsByProvider(
    provider: MediaProviderType
): Record<string, MediaModelConfig> {
    return Object.fromEntries(
        Object.entries(MEDIA_MODELS).filter(
            ([_, config]) => config.provider === provider
        )
    );
}

// Получить конфиг модели по ключу
export function getModelConfig(modelKey: string): MediaModelConfig | undefined {
    return MEDIA_MODELS[modelKey];
}

// Конфигурация OpenRouter API
export const openRouterConfig = {
    apiKey: process.env.OPENROUTER_API_KEY || '',
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
        'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
        'X-Title': 'AI Media API',
    },
};

// Пути для сохранения файлов
export const mediaStorageConfig = {
    basePath: 'ai-media',
    previewsPath: 'ai-media/previews',
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    allowedVideoTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
    allowedAudioTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
    previewSize: {
        width: 200,
        height: 200,
    },
};

// ID группы Telegram для уведомлений (установи в .env)
export const telegramConfig = {
    notificationGroupId: process.env.TELEGRAM_MEDIA_GROUP_ID || '',
};
