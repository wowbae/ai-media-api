// Интерфейсы для OpenRouter API
// Документация: https://openrouter.ai/docs

// Конфигурация OpenRouter провайдера
export interface OpenRouterConfig {
    apiKey: string;
    baseURL: string;
    defaultHeaders?: Record<string, string>;
}

// Формат сообщения OpenRouter
export interface OpenRouterMessage {
    role: 'user' | 'assistant' | 'system';
    content: string | OpenRouterContent[];
}

// Контент сообщения (текст или изображение)
export interface OpenRouterContent {
    type: 'text' | 'image_url';
    text?: string;
    image_url?: {
        url: string;
    };
}

// Часть ответа с изображением от Gemini
export interface GeminiImagePart {
    inlineData?: {
        mimeType: string;
        data: string;
    };
    text?: string;
}

// Типы разрешений для генерации
export type AspectRatio = '1:1' | '9:16' | '16:9';
export type Quality = '1k' | '2k' | '4k';
