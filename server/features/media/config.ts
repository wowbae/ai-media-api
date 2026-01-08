// Конфигурация моделей для генерации медиа
import 'dotenv/config';

export interface MediaModelConfig {
    id: string;
    name: string;
    types: readonly ('IMAGE' | 'VIDEO' | 'AUDIO')[];
    maxPromptLength: number;
    supportsImageInput: boolean;
    provider: 'openrouter' | 'gptunnel'; // Провайдер для этой модели
    pricing?: {
        input?: number;  // $ за 1M токенов или за изображение
        output?: number;
    };
}

export const MEDIA_MODELS = {
    NANO_BANANA: {
        id: 'google/gemini-3-pro-image-preview',
        name: 'Nano Banana 2 Pro',
        types: ['IMAGE'] as const,
        maxPromptLength: 8192,
        supportsImageInput: true,
        provider: 'openrouter' as const,
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
        provider: 'openrouter' as const,
        pricing: {
            output: 0.04, // за видео
        },
    },
    MIDJOURNEY: {
        id: 'midjourney/imagine', // GPTunnel endpoint
        name: 'Midjourney',
        types: ['IMAGE'] as const,
        maxPromptLength: 4000,
        supportsImageInput: false, // Midjourney через GPTunnel не поддерживает входные изображения
        provider: 'gptunnel' as const,
        pricing: {
            output: 18, // 18 единиц за генерацию (completion_cost из API)
        },
    },
    VEO_3_1_FAST: {
        id: 'glabs-veo-3-1-fast',
        name: 'Veo 3.1 Fast',
        types: ['VIDEO'] as const,
        maxPromptLength: 2048,
        supportsImageInput: true, // Поддерживает image-to-video
        provider: 'gptunnel' as const,
        pricing: {
            output: 50, // примерная стоимость
        },
    },
} as const;

export type MediaModelKey = keyof typeof MEDIA_MODELS;

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

