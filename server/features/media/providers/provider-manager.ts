// Менеджер провайдеров - фабрика и маппинг моделей на провайдеры
import type { MediaModel } from '@prisma/client';
import type { MediaProvider } from './interfaces';
import { createOpenRouterProvider } from './openrouter';
import { createGPTunnelMediaProvider } from './gptunnel';
import { createLaoZhangProvider } from './laozhang';
import {
    createKieAiMidjourneyProvider,
    createKieAiKlingProvider,
} from './kieai';
import { MEDIA_MODELS, type MediaModelConfig } from '../config';
import 'dotenv/config';

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

    // GPTunnel провайдеры
    const gptunnelApiKey = process.env.GPTUNNEL_API_KEY || '';
    if (gptunnelApiKey) {
        const gptunnelConfig = {
            apiKey: gptunnelApiKey,
            baseURL: 'https://gptunnel.ru',
        };

        // Media провайдер (для Veo 3.1 Fast и других моделей /v1/media API)
        providers.gptunnel = createGPTunnelMediaProvider(gptunnelConfig);
    }

    // Kie.ai провайдеры - кешируем по модели, чтобы сохранять состояние (например, recordId Map)
    const kieaiProviders: Record<string, MediaProvider> = {};

    // LaoZhang провайдер (Nano Banana Pro, Sora 2, Veo 3.1)
    const laozhangApiKey = process.env.LAOZHANG_API_KEY || '';
    if (laozhangApiKey) {
        providers.laozhang = createLaoZhangProvider({
            apiKey: laozhangApiKey,
            baseURL: 'https://api.laozhang.ai',
        });
    }

    return {
        getProvider(model: MediaModel): MediaProvider {
            const modelConfig = MEDIA_MODELS[model];
            if (!modelConfig) {
                throw new Error(`Неизвестная модель: ${model}`);
            }

            // Для kieai провайдера выбираем правильный подпровайдер по модели
            if (modelConfig.provider === 'kieai') {
                // Кешируем провайдеры, чтобы сохранять состояние между вызовами
                if (kieaiProviders[model]) {
                    return kieaiProviders[model];
                }

                const kieaiApiKey = process.env.KIEAI_API_KEY || '';
                if (!kieaiApiKey) {
                    throw new Error('KIEAI_API_KEY не настроен');
                }

                const kieaiConfig = {
                    apiKey: kieaiApiKey,
                    baseURL: 'https://api.kie.ai',
                };

                // Для Kling 2.6 используем kling провайдер
                if (model === 'KLING_2_6') {
                    kieaiProviders[model] = createKieAiKlingProvider(kieaiConfig);
                    return kieaiProviders[model];
                }

                // Для остальных моделей kieai (Midjourney) используем midjourney провайдер
                kieaiProviders[model] = createKieAiMidjourneyProvider(kieaiConfig);
                return kieaiProviders[model];
            }

            const provider = providers[modelConfig.provider];
            if (!provider) {
                throw new Error(
                    `Провайдер ${modelConfig.provider} не настроен. Проверьте переменные окружения.`
                );
            }

            return provider;
        },

        getModelConfig(model: MediaModel): MediaModelConfig | undefined {
            return MEDIA_MODELS[model];
        },

        getAvailableModels() {
            return Object.entries(MEDIA_MODELS).map(([key, config]) => ({
                key,
                name: config.name,
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
