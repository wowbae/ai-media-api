// Интерфейсы для GPTunnel API
// Документация: https://docs.gptunnel.ru/

// Общая конфигурация GPTunnel провайдера
export interface GPTunnelConfig {
    apiKey: string;
    baseURL: string;
}

// Статусы задач GPTunnel
export type GPTunnelTaskStatus = 'idle' | 'processing' | 'done' | 'failed';

// ==================== Media API (/v1/media) ====================

// Ответ на создание задачи через /v1/media/create
export interface GPTunnelMediaCreateResponse {
    code: number;
    id: string;
    model: string;
    prompt: string;
    created_at: number;
    status: GPTunnelTaskStatus;
    url: string | null;
}

// Ответ на проверку статуса через /v1/media/result
export interface GPTunnelMediaResultResponse {
    code: number;
    id: string;
    model: string;
    prompt: string;
    created_at: number;
    status: GPTunnelTaskStatus;
    url: string | null;
    error?: string;
}

// ==================== Midjourney API (/v1/midjourney) ====================

// Информация об использовании токенов
export interface MidjourneyUsage {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    prompt_cost: number;
    completion_cost: number;
    total_cost: number;
}

// Ответ на создание задачи через /v1/midjourney/imagine
export interface MidjourneyImagineResponse {
    id: string;
    parentId: string | null;
    object: 'task';
    type: 'imagine';
    actions: string[];
    percent: number;
    status: GPTunnelTaskStatus;
    result: string | null; // URL изображения
    error: string | null;
    usage: MidjourneyUsage;
}

// Ответ на проверку статуса через /v1/midjourney/result
export interface MidjourneyResultResponse extends MidjourneyImagineResponse {
    // Та же структура, что и при создании
}
