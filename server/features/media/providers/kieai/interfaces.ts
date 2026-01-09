// Интерфейсы для Kie.ai API
// Документация: https://kie.ai/model-preview/features/mj-api

// Конфигурация Kie.ai провайдера
export interface KieAiConfig {
    apiKey: string;
    baseURL: string;
}

// Типы задач
export type KieAiTaskType = 'Text to Image' | 'Image to Image' | 'Image to Video';

// Скорость генерации
export type KieAiSpeed = 'relaxed' | 'fast' | 'turbo';

// Версия Midjourney
export type KieAiVersion =
    | 'Version 7'
    | 'Version 6.1'
    | 'Version 6'
    | 'Version 5.2'
    | 'Version 5.1'
    | 'Niji 6';

// Соотношение сторон
export type KieAiAspectRatio =
    | '1:1'
    | '9:16'
    | '16:9'
    | '1:29'
    | '162:33'
    | '45:66'
    | '54:33'
    | '21:116'
    | '92:1';

// Статусы задач Kie.ai
export type KieAiTaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

// Запрос на создание задачи
export interface KieAiCreateRequest {
    taskType: KieAiTaskType;
    speed?: KieAiSpeed;
    prompt: string;
    enableTranslation?: boolean;
    aspectRatio?: KieAiAspectRatio;
    version?: KieAiVersion;
    stylization?: number; // 0-1000
    weirdness?: number; // 0-3000
    variety?: number; // 0-100
    waterMark?: string;
}

// Ответ на создание задачи
export interface KieAiCreateResponse {
    taskId: string;
    status: KieAiTaskStatus;
    message?: string;
}

// Ответ на проверку статуса задачи
export interface KieAiStatusResponse {
    taskId: string;
    status: KieAiTaskStatus;
    result?: {
        url: string;
        urls?: string[]; // Для множественных результатов
    };
    error?: string;
    progress?: number;
}
