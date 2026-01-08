// Конфигурация моделей для генерации медиа через OpenRouter
import 'dotenv/config';

export interface MediaModelConfig {
    id: string;
    name: string;
    types: readonly ('IMAGE' | 'VIDEO' | 'AUDIO')[];
    maxPromptLength: number;
    supportsImageInput: boolean;
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
        pricing: {
            input: 0.1,
            output: 0.4,
        },
    },
    KLING: {
        id: 'kling-ai/kling-video',
        name: 'Kling AI (Video)',
        types: ['VIDEO', 'IMAGE'] as const,
        maxPromptLength: 2048,
        supportsImageInput: true,
        pricing: {
            output: 0.04, // за изображение
        },
    },
    MIDJOURNEY: {
        id: 'midjourney/imagine', // placeholder - будет добавлен позже
        name: 'Midjourney',
        types: ['IMAGE'] as const,
        maxPromptLength: 4000,
        supportsImageInput: true,
        pricing: {
            output: 0.05,
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

