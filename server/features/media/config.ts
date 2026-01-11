// Конфигурация моделей для генерации медиа
// Единственный источник истины для всех провайдеров
import "dotenv/config";

export type MediaProviderType =
  | "openrouter"
  | "gptunnel"
  | "laozhang"
  | "kieai";

export interface MediaModelConfig {
  id: string;
  name: string;
  types: readonly ("IMAGE" | "VIDEO" | "AUDIO")[];
  maxPromptLength: number;
  supportsImageInput: boolean;
  provider: MediaProviderType;
  pricing?: {
    input?: number; // $ за 1M токенов или за изображение
    output?: number;
  };
}

// ИСХОДНЫЙ ОСНОВНОЙ ГЛАВНЫЙ СПИСОК ВСЕХ МОДЕЛЕЙ
export const MEDIA_MODELS: Record<string, MediaModelConfig> = {
    KLING_2_6: {
        id: 'kling-2-6',
        name: 'Kling 2.6',
        types: ['VIDEO'] as const,
        maxPromptLength: 4096,
        supportsImageInput: true,
        provider: 'kieai',
        pricing: {
            output: 0.1, // стоимость за видео (уточнить)
        },
    },
    KLING_2_5_TURBO_PRO: {
        id: 'kling-2-5-turbo-pro',
        name: 'Kling 2.5 Turbo Pro',
        types: ['VIDEO'] as const,
        maxPromptLength: 4096,
        supportsImageInput: true,
        provider: 'kieai',
        pricing: {
            output: 0.1, // стоимость за видео (уточнить)
        },
    },
    // Kie.ai провайдер - модель для генерации изображений
    NANO_BANANA_PRO_KIEAI: {
        id: 'nano-banana-pro',
        name: 'Nano Banana Pro',
        types: ['IMAGE'] as const,
        maxPromptLength: 8192,
        supportsImageInput: true, // Поддерживает image-to-image
        provider: 'kieai',
        pricing: {
            output: 0.09, // $0.09 за изображение
        },
    },
    IMAGEN4_KIEAI: {
        id: 'google/imagen4',
        name: 'Google Imagen4',
        types: ['IMAGE'] as const,
        maxPromptLength: 8192,
        supportsImageInput: false,
        provider: 'kieai',
        pricing: {
            output: 0.1, // стоимость за изображение (уточнить)
        },
    },
    SEEDREAM_4_5: {
        id: 'seedream/4.5-text-to-image',
        name: 'Seedream 4.5',
        types: ['IMAGE'] as const,
        maxPromptLength: 8192,
        supportsImageInput: false,
        provider: 'kieai',
        pricing: {
            output: 0.1, // TODO: уточнить цену для Seedream 4.5 Text-to-Image
        },
    },
    SEEDREAM_4_5_EDIT: {
        id: 'seedream/4.5-edit',
        name: 'Seedream 4.5 Edit',
        types: ['IMAGE'] as const,
        maxPromptLength: 8192,
        supportsImageInput: true, // Поддерживает image-to-image с до 14 файлов
        provider: 'kieai',
        pricing: {
            output: 0.1, // TODO: уточнить цену для Seedream 4.5 Edit
        },
    },
    // пока выключил, не нужны, НО НЕ УДАЛЯТЬ ИХ
    // NANO_BANANA_OPENROUTER: {
    //     id: 'google/gemini-3-pro-image-preview',
    //     name: 'Nano Banana Pro',
    //     types: ['IMAGE'] as const,
    //     maxPromptLength: 8192,
    //     supportsImageInput: true,
    //     provider: 'openrouter',
    //     pricing: {
    //         input: 0.1,
    //         output: 0.4,
    //     },
    // },
    // MIDJOURNEY: {
    //   id: "midjourney/imagine",
    //   name: "Midjourney",
    //   types: ["IMAGE"] as const,
    //   maxPromptLength: 4000,
    //   supportsImageInput: false,
    //   provider: "kieai", // Провайдер через Kie.ai API
    //   pricing: {
    //     output: 18,
    //   },
    // },
    // VEO_3_1_FAST: {
    //   id: "glabs-veo-3-1-fast",
    //   name: "Veo 3.1 Fast",
    //   types: ["VIDEO"] as const,
    //   maxPromptLength: 4096,
    //   supportsImageInput: true,
    //   provider: "gptunnel",
    //   pricing: {
    //     output: 0.1,
    //   },
    // },
    // // LaoZhang провайдер - модели для генерации изображений и видео
    // NANO_BANANA_PRO_LAOZHANG: {
    //   id: "gemini-3-pro-image-preview",
    //   name: "Nano Banana Pro",
    //   types: ["IMAGE"] as const,
    //   maxPromptLength: 8192,
    //   supportsImageInput: true,
    //   provider: "laozhang",
    //   pricing: {
    //     output: 0.05, // $0.05 за изображение 4K
    //   },
    // },
    // SORA_2: {
    //   id: "sora-2-540p-10s",
    //   name: "Sora 2",
    //   types: ["VIDEO"] as const,
    //   maxPromptLength: 4096,
    //   supportsImageInput: true,
    //   provider: "laozhang",
    //   pricing: {
    //     output: 0.3, // стоимость за видео
    //   },
    // },
    // VEO_3_1: {
    //   id: "veo-3.1-720p-async",
    //   name: "Veo 3.1",
    //   types: ["VIDEO"] as const,
    //   maxPromptLength: 4096,
    //   supportsImageInput: true,
    //   provider: "laozhang",
    //   pricing: {
    //     output: 0.5, // стоимость за видео
    //   },
    // },
};

export type MediaModelKey = keyof typeof MEDIA_MODELS;

// Получить модели по провайдеру
export function getModelsByProvider(
  provider: MediaProviderType,
): Record<string, MediaModelConfig> {
  return Object.fromEntries(
    Object.entries(MEDIA_MODELS).filter(
      ([_, config]) => config.provider === provider,
    ),
  );
}

// Получить конфиг модели по ключу
export function getModelConfig(modelKey: string): MediaModelConfig | undefined {
  return MEDIA_MODELS[modelKey];
}

// Конфигурация OpenRouter API
export const openRouterConfig = {
  apiKey: process.env.OPENROUTER_API_KEY || "",
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
    "X-Title": "AI Media API",
  },
};

// Пути для сохранения файлов
export const mediaStorageConfig = {
  basePath: "ai-media",
  previewsPath: "ai-media/previews",
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowedImageTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  allowedVideoTypes: ["video/mp4", "video/webm", "video/quicktime"],
  allowedAudioTypes: ["audio/mpeg", "audio/wav", "audio/ogg"],
  previewSize: {
    width: 200,
    height: 200,
  },
};

// ID группы Telegram для уведомлений (установи в .env)
export const telegramConfig = {
  notificationGroupId: process.env.TELEGRAM_MEDIA_GROUP_ID || "",
};
