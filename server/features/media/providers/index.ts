// Экспорт провайдеров и их интерфейсов

// Общие интерфейсы
export * from './interfaces';

// GPTunnel провайдеры (Media API)
export {
    createGPTunnelMediaProvider,
    type GPTunnelConfig,
} from './gptunnel';

// LaoZhang провайдер (Nano Banana Pro, Sora 2, Veo 3.1)
export {
    createLaoZhangProvider,
    createLaoZhangImageProvider,
    createLaoZhangVideoProvider,
    type LaoZhangConfig,
} from './laozhang';

// Kie.ai провайдер (Midjourney через Kie.ai API)
export {
    createKieAiMidjourneyProvider,
    type KieAiConfig,
} from './kieai';

// Wavespeed провайдер (Kling Video O1)
export {
    createWavespeedProvider,
    type WavespeedConfig,
} from './wavespeed';

// Менеджер провайдеров
export {
    createProviderManager,
    getProviderManager,
    type ProviderManager,
} from './provider-manager';
