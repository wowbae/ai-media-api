// Менеджер провайдеров - фабрика и маппинг моделей на провайдеры
import type { MediaModel } from '@prisma/client';
import type { MediaProvider, MediaModelConfig } from './interfaces';
import { createOpenRouterProvider, getOpenRouterModels } from './openrouter.provider';
import { createGPTunnelProvider } from './gptunnel.provider';
import { createMidjourneyProvider } from './midjourney.provider';
import 'dotenv/config';

// Конфигурация GPTunnel моделей (кроме Midjourney - у него свой провайдер)
const GPTUNNEL_MODELS: Record<string, MediaModelConfig> = {
    VEO_3_1_FAST: {
        id: 'glabs-veo-3-1-fast',
        name: 'Veo 3.1 Fast',
        types: ['VIDEO'] as const,
        maxPromptLength: 4096,
        supportsImageInput: true, // Поддерживает первый кадр
        provider: 'gptunnel',
        pricing: {
            output: 0.1, // Примерная цена
        },
    },
};

// Конфигурация Midjourney модели (через GPTunnel /midjourney API)
const MIDJOURNEY_MODELS: Record<string, MediaModelConfig> = {
    MIDJOURNEY: {
        id: 'midjourney/imagine',
        name: 'Midjourney',
        types: ['IMAGE'] as const,
        maxPromptLength: 4000,
        supportsImageInput: false, // Midjourney через GPTunnel не поддерживает входные изображения
        provider: 'midjourney', // Отдельный провайдер для Midjourney
        pricing: {
            output: 18, // 18 единиц за генерацию (completion_cost из API)
        },
    },
};

// Маппинг модели на провайдер
// Для добавления новой модели: добавь её в enum MediaModel и укажи провайдер здесь
const MODEL_PROVIDER_MAP: Record<MediaModel, string> = {
    NANO_BANANA: 'openrouter',
    KLING: 'openrouter',
    MIDJOURNEY: 'midjourney', // Отдельный провайдер через GPTunnel /midjourney API
    VEO_3_1_FAST: 'gptunnel',
};

export interface ProviderManager {
    // Получить провайдер для конкретной модели
    getProvider(model: MediaModel): MediaProvider;

    // Получить конфиг модели
    getModelConfig(model: MediaModel): MediaModelConfig | undefined;

    // Получить все доступные модели
    getAvailableModels(): Array<{
        key: string;
        name: string;
        types: readonly string[];
        supportsImageInput: boolean;
        provider: string;
    }>;
}

export function createProviderManager(): ProviderManager {
    // Создаём провайдеры
    const providers: Record<string, MediaProvider> = {};

    // OpenRouter провайдер
    const openRouterApiKey = process.env.OPENROUTER_API_KEY || '';
    if (openRouterApiKey) {
        providers.openrouter = createOpenRouterProvider({
            apiKey: openRouterApiKey,
            baseURL: 'https://openrouter.ai/api/v1',
            defaultHeaders: {
                'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
                'X-Title': 'AI Media API',
            },
        });
    }

    // GPTunnel провайдер (для Veo 3.1 Fast и других моделей /v1/media API)
    const gptunnelApiKey = process.env.GPTUNNEL_API_KEY || '';
    if (gptunnelApiKey) {
        providers.gptunnel = createGPTunnelProvider({
            apiKey: gptunnelApiKey,
            baseURL: 'https://gptunnel.ru',
        });

        // Midjourney провайдер (использует /v1/midjourney API GPTunnel)
        providers.midjourney = createMidjourneyProvider({
            apiKey: gptunnelApiKey,
            baseURL: 'https://gptunnel.ru',
        });
    }

    // Объединяем конфиги всех моделей
    const allModels: Record<string, MediaModelConfig> = {
        ...getOpenRouterModels(),
        ...GPTUNNEL_MODELS,
        ...MIDJOURNEY_MODELS,
    };

    return {
        getProvider(model: MediaModel): MediaProvider {
            const providerName = MODEL_PROVIDER_MAP[model];
            if (!providerName) {
                throw new Error(`Неизвестная модель: ${model}`);
            }

            const provider = providers[providerName];
            if (!provider) {
                throw new Error(
                    `Провайдер ${providerName} не настроен. Проверьте переменные окружения.`
                );
            }

            return provider;
        },

        getModelConfig(model: MediaModel): MediaModelConfig | undefined {
            return allModels[model];
        },

        getAvailableModels() {
            return Object.entries(allModels).map(([key, config]) => ({
                key,
                name: config.name,
                // Убеждаемся, что types - это обычный массив без дубликатов
                types: Array.from(new Set(config.types)),
                supportsImageInput: config.supportsImageInput,
                provider: config.provider,
            }));
        },
    };
}

// Singleton для использования по всему приложению
let providerManagerInstance: ProviderManager | null = null;

export function getProviderManager(): ProviderManager {
    if (!providerManagerInstance) {
        providerManagerInstance = createProviderManager();
    }
    return providerManagerInstance;
}
