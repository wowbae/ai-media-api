// Интерфейсы для LaoZhang API
// Документация: https://docs.laozhang.ai/en

// Конфигурация LaoZhang провайдера
export interface LaoZhangConfig {
    apiKey: string;
    baseURL: string;
}

// Статусы задач для асинхронных моделей (Sora 2, Veo 3.1)
export type LaoZhangTaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

// ==================== Image API (Nano Banana Pro) ====================

// Формат сообщения для chat completions
export interface LaoZhangMessage {
    role: 'user' | 'assistant' | 'system';
    content: string | LaoZhangContent[];
}

// Контент сообщения (текст или изображение)
export interface LaoZhangContent {
    type: 'text' | 'image_url';
    text?: string;
    image_url?: {
        url: string;
    };
}

// Ответ на генерацию изображения (синхронный)
export interface LaoZhangImageResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: Array<{
        index: number;
        message: {
            role: string;
            content: string | null;
            images?: Array<{
                image_url: {
                    url: string;
                };
            }>;
        };
        finish_reason: string;
    }>;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

// ==================== Video API (Sora 2, Veo 3.1) ====================

// Запрос на создание видео (асинхронный)
export interface LaoZhangVideoRequest {
    model: string;
    prompt: string;
    image_url?: string; // Для image-to-video
    aspect_ratio?: '16:9' | '9:16' | '1:1';
    duration?: number; // Длительность видео в секундах
}

// Ответ на создание задачи видео
export interface LaoZhangVideoCreateResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: Array<{
        message: {
            role: string;
            content: string; // Содержит task_id или статус
        };
    }>;
    task_id?: string;
    status?: LaoZhangTaskStatus;
}

// Ответ на проверку статуса видео задачи
export interface LaoZhangVideoStatusResponse {
    task_id: string;
    status: LaoZhangTaskStatus;
    result?: {
        url: string;
        duration?: number;
    };
    error?: string;
    progress?: number;
}

// Типы разрешений для генерации
export type AspectRatio = '1:1' | '9:16' | '16:9';
export type Quality = '1k' | '2k' | '4k';
