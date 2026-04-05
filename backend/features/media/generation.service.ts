// Центральный сервис для работы с медиа-генерацией
// Управляет генерацией через различные провайдеры (GPTunnel, LaoZhang, Kie.ai, Wavespeed)
// Все провайдеры работают по async-схеме: создают задачу и возвращают taskId
// Исключение: некоторые провайдеры (laozhang-image) могут работать синхронно
import type { GenerateMediaOptions } from "./types";
import { processGeneration } from "./media-processor";
import { getProviderManager } from "./providers";

/**
 * Основная функция генерации медиа через провайдеры
 * Создаёт задачу и возвращает taskId для последующей проверки статуса
 */
export async function generateMedia(
    options: GenerateMediaOptions,
): Promise<void> {
    await processGeneration(options);
}

/**
 * Получение доступных моделей
 */
export function getAvailableModels(): Array<{
    key: string;
    name: string;
    types: readonly string[];
    supportsImageInput: boolean;
}> {
    const providerManager = getProviderManager();
    return providerManager.getAvailableModels();
}
