// Менеджер провайдеров - фабрика и маппинг моделей на провайдеры
import type { MediaModel } from "../config";
import type { MediaProvider } from "./interfaces";
import { createGPTunnelMediaProvider } from "./gptunnel";
import { createLaoZhangProvider } from "./laozhang";
import { createUnifiedKieAiProvider } from "./kieai/unified-provider";
import type { KieAiConfig } from "./kieai/interfaces";
import { createWavespeedProvider } from "./wavespeed";
import { MEDIA_MODELS, type MediaModelConfig } from "../config";
import "dotenv/config";

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

    // GPTunnel провайдеры
    const gptunnelApiKey = process.env.GPTUNNEL_API_KEY || "";
    if (gptunnelApiKey) {
        const gptunnelConfig = {
            apiKey: gptunnelApiKey,
            baseURL: "https://gptunnel.ru",
        };

        // Media провайдер (для Veo 3.1 Fast и других моделей /v1/media API)
        providers.gptunnel = createGPTunnelMediaProvider(gptunnelConfig);
    }

    // Единый Kie.ai провайдер для всех kieai-моделей
    const kieaiApiKey = process.env.KIEAI_API_KEY || "";
    if (kieaiApiKey) {
        const kieaiConfig: KieAiConfig = {
            apiKey: kieaiApiKey,
            baseURL: "https://api.kie.ai",
        };
        providers.kieai = createUnifiedKieAiProvider(kieaiConfig);
    }

    // LaoZhang провайдер (Nano Banana Pro, Sora 2, Veo 3.1)
    const laozhangApiKey = process.env.LAOZHANG_API_KEY || "";
    if (laozhangApiKey) {
        providers.laozhang = createLaoZhangProvider({
            apiKey: laozhangApiKey,
            baseURL: "https://api.laozhang.ai",
        });
    }

    // Wavespeed провайдер (Kling Video O1)
    const wavespeedApiKey = process.env.WAVESPEED_AI_API_KEY || "";
    if (wavespeedApiKey) {
        providers.wavespeed = createWavespeedProvider({
            apiKey: wavespeedApiKey,
        });
    }

    return {
        getProvider(model: MediaModel): MediaProvider {
            const modelConfig = MEDIA_MODELS[model];
            if (!modelConfig) {
                throw new Error(`Неизвестная модель: ${model}`);
            }

            // Для остальных провайдеров
            const provider = providers[modelConfig.provider];
            if (!provider) {
                throw new Error(
                    `Провайдер ${modelConfig.provider} не настроен. Проверьте переменные окружения.`,
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
                promptLimit: config.promptLimit ?? 5000,
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
