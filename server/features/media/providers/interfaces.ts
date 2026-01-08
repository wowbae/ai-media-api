// Интерфейсы для абстракции провайдеров медиа-генерации
import type { MediaModel } from '@prisma/client';
import type { SavedFileInfo } from '../file.service';

// Параметры запроса на генерацию
export interface GenerateParams {
    requestId: number;
    prompt: string;
    model: MediaModel;
    inputFiles?: string[];
    aspectRatio?: '1:1' | '9:16' | '16:9';
    quality?: '1k' | '2k' | '4k';
}

// Результат создания задачи (для async провайдеров)
export interface TaskCreatedResult {
    taskId: string;
    status: 'pending' | 'processing';
}

// Результат проверки статуса задачи
export interface TaskStatusResult {
    status: 'pending' | 'processing' | 'done' | 'failed';
    url?: string;
    error?: string;
}

// Абстрактный интерфейс провайдера медиа-генерации
export interface MediaProvider {
    // Уникальный идентификатор провайдера
    readonly name: string;

    // Является ли провайдер асинхронным (требует polling)
    readonly isAsync: boolean;

    // Запуск генерации
    // Для sync провайдеров - возвращает файлы сразу
    // Для async провайдеров - создаёт задачу и возвращает taskId
    generate(params: GenerateParams): Promise<SavedFileInfo[] | TaskCreatedResult>;

    // Проверка статуса задачи (только для async провайдеров)
    checkTaskStatus?(taskId: string): Promise<TaskStatusResult>;

    // Получение результата задачи (только для async провайдеров)
    getTaskResult?(taskId: string): Promise<SavedFileInfo[]>;
}

// Конфигурация модели
export interface MediaModelConfig {
    id: string;
    name: string;
    types: readonly ('IMAGE' | 'VIDEO' | 'AUDIO')[];
    maxPromptLength: number;
    supportsImageInput: boolean;
    provider: string; // Идентификатор провайдера
    pricing?: {
        input?: number;
        output?: number;
    };
}

// Конфигурация провайдера
export interface ProviderConfig {
    apiKey: string;
    baseURL: string;
    defaultHeaders?: Record<string, string>;
}

// Тип для проверки является ли результат async
export function isTaskCreatedResult(
    result: SavedFileInfo[] | TaskCreatedResult
): result is TaskCreatedResult {
    return 'taskId' in result && 'status' in result;
}
