// Конфигурация моделей для генерации медиа
// Единственный источник истины для всех провайдеров
import "dotenv/config";

export type MediaProviderType =
  | "gptunnel"
  | "laozhang"
  | "kieai"
  | "wavespeed";

export interface MediaModelConfig {
  id: string;
  name: string;
  types: readonly ("IMAGE" | "VIDEO" | "AUDIO")[];
  maxPromptLength: number;
  promptLimit?: number; // Лимит символов в промпте (по умолчанию 5000)
  supportsImageInput: boolean;
  provider: MediaProviderType;
  pricing?: {
    input?: number; // $ за 1M токенов или за изображение
    output?: number;
  };
}

// ИСХОДНЫЙ ОСНОВНОЙ ГЛАВНЫЙ СПИСОК ВСЕХ МОДЕЛЕЙ
export const MEDIA_MODELS: Record<string, MediaModelConfig> = {
    KLING_2_6_KIEAI: {
        id: 'kling-2-6',
        name: 'Kling 2.6',
        types: ['VIDEO'] as const,
        maxPromptLength: 4096,
        promptLimit: 1000,
        supportsImageInput: true,
        provider: 'kieai',
        pricing: {
            output: 0.1, // стоимость за видео (уточнить)
        },
    },
    MIDJOURNEY: {
        id: 'midjourney/imagine',
        name: 'Midjourney',
        types: ['IMAGE'] as const,
        maxPromptLength: 4000,
        supportsImageInput: false,
        provider: 'kieai',
        pricing: {
            output: 0.5,
        },
    },
    // Kie.ai провайдер - модель для генерации изображений
    NANO_BANANA_PRO_KIEAI: {
        id: 'nano-banana-pro',
        name: 'Nano Banana Pro',
        types: ['IMAGE'] as const,
        maxPromptLength: 8192,
        promptLimit: 5000,
        supportsImageInput: true, // Поддерживает image-to-image
        provider: 'kieai',
        pricing: {
            output: 0.09, // $0.09 за изображение
        },
    },
    NANO_BANANA_2_KIEAI: {
        id: 'nano-banana-2',
        name: 'Nano Banana 2',
        types: ['IMAGE'] as const,
        maxPromptLength: 8192,
        promptLimit: 5000,
        supportsImageInput: true, // Поддерживает image-to-image (до 14 файлов)
        provider: 'kieai',
        pricing: {
            output: 0.05, // $0.05 за изображение (ниже чем Pro)
        },
    },
    IMAGEN4_KIEAI: {
        id: 'google/imagen4',
        name: 'Google Imagen4',
        types: ['IMAGE'] as const,
        maxPromptLength: 8192,
        promptLimit: 5000,
        supportsImageInput: false,
        provider: 'kieai',
        pricing: {
            output: 0.1, // стоимость за изображение (уточнить)
        },
    },
    IMAGEN4_ULTRA_KIEAI: {
        id: 'google/imagen4-ultra',
        name: 'Google Imagen4 Ultra',
        types: ['IMAGE'] as const,
        maxPromptLength: 8192,
        promptLimit: 5000,
        supportsImageInput: false,
        provider: 'kieai',
        pricing: {
            output: 0.15, // Ultra может быть дороже (уточнить)
        },
    },
    SEEDREAM_4_5_KIEAI: {
        id: 'seedream/4.5-text-to-image',
        name: 'Seedream 4.5',
        types: ['IMAGE'] as const,
        maxPromptLength: 8192,
        promptLimit: 3000,
        supportsImageInput: false,
        provider: 'kieai',
        pricing: {
            output: 0.1, // TODO: уточнить цену для Seedream 4.5 Text-to-Image
        },
    },
    SEEDREAM_4_5_EDIT_KIEAI: {
        id: 'seedream/4.5-edit',
        name: 'Seedream 4.5 Edit',
        types: ['IMAGE'] as const,
        maxPromptLength: 8192,
        promptLimit: 3000,
        supportsImageInput: true, // Поддерживает image-to-image с до 14 файлов
        provider: 'kieai',
        pricing: {
            output: 0.1, // TODO: уточнить цену для Seedream 4.5 Edit
        },
    },
    SEEDREAM_5_0_LITE_KIEAI: {
        id: 'seedream/5-lite-text-to-image',
        name: 'Seedream 5.0 Lite',
        types: ['IMAGE'] as const,
        maxPromptLength: 8192,
        promptLimit: 3000,
        supportsImageInput: false,
        provider: 'kieai',
        pricing: {
            output: 0.1, // TODO: уточнить цену для Seedream 5.0 Lite
        },
    },
    SEEDREAM_5_0_LITE_EDIT_KIEAI: {
        id: 'seedream/5-lite-image-to-image',
        name: 'Seedream 5.0 Lite Edit',
        types: ['IMAGE'] as const,
        maxPromptLength: 8192,
        promptLimit: 3000,
        supportsImageInput: true, // Поддерживает image-to-image с до 14 файлов
        provider: 'kieai',
        pricing: {
            output: 0.1, // TODO: уточнить цену для Seedream 5.0 Lite Edit
        },
    },
    KLING_3_0_KIEAI: {
        id: 'kling-3.0',
        name: 'Kling 3.0',
        types: ['VIDEO'] as const,
        maxPromptLength: 4096,
        promptLimit: 2500,
        supportsImageInput: true, // Поддерживает image-to-video (start/end frame)
        provider: 'kieai',
        pricing: {
            output: 0.15, // TODO: уточнить цену для Kling 3.0
        },
    },
    // LaoZhang провайдер
    NANO_BANANA_PRO_LAOZHANG: {
        id: 'gemini-3-pro-image-preview',
        name: 'Nano Banana Pro',
        types: ['IMAGE'] as const,
        maxPromptLength: 8192,
        promptLimit: 5000,
        supportsImageInput: true,
        provider: 'laozhang',
        pricing: {
            output: 0.05,
        },
    },
    VEO_3_1_FAST_KIEAI: {
        id: 'veo3_fast',
        name: 'Veo 3.1 Fast',
        types: ['VIDEO'] as const,
        maxPromptLength: 4096,
        supportsImageInput: true, // Поддерживает image-to-video
        provider: 'kieai',
        pricing: {
            output: 0.1, // TODO: уточнить цену для Veo 3.1 Fast
        },
    },
    // Kie.ai провайдер - ElevenLabs Multilingual v2 для генерации аудио
    ELEVENLABS_MULTILINGUAL_V2_KIEAI: {
        id: 'elevenlabs/text-to-speech-multilingual-v2',
        name: 'ElevenLabs Multilingual v2',
        types: ['AUDIO'] as const,
        maxPromptLength: 5000, // Лимит текста для TTS
        supportsImageInput: false,
        provider: 'kieai',
        pricing: {
            output: 0.1, // TODO: уточнить цену для ElevenLabs Multilingual v2
        },
    },
    // Wavespeed провайдер - Kling Video O1 для генерации видео
    KLING_VIDEO_O1_WAVESPEED: {
        id: 'kwaivgi/kling-video-o1-std/reference-to-video',
        name: 'Kling Video O1',
        types: ['VIDEO'] as const,
        maxPromptLength: 4096,
        supportsImageInput: true, // Поддерживает reference images (до 10)
        provider: 'wavespeed',
        pricing: {
            output: 0.112, // $0.112 за 1 секунду видео (цена зависит от длительности: от 3 до 10 секунд)
        },
    },
    // Kie.ai провайдер - Kling 2.6 Motion Control (image + video → video)
    KLING_2_6_MOTION_CONTROL_KIEAI: {
        id: 'kling-2.6/motion-control',
        name: 'Kling 2.6 Motion Control',
        types: ['VIDEO'] as const,
        maxPromptLength: 2500,
        promptLimit: 2500,
        supportsImageInput: true, // Требует 1 изображение + 1 видео
        provider: 'kieai',
        pricing: {
            output: 0.15,
        },
    },
    // Kie.ai провайдер - Seedance 1.5 Pro для генерации видео
    SEEDANCE_1_5_PRO_KIEAI: {
        id: 'seedance-1-5-pro',
        name: 'Seedance 1.5 Pro',
        types: ['VIDEO'] as const,
        maxPromptLength: 2500,
        promptLimit: 2500,
        supportsImageInput: true, // Поддерживает image-to-video (до 2 изображений)
        provider: 'kieai',
        pricing: {
            output: 0.1, // TODO: уточнить цену для Seedance 1.5 Pro
        },
    },
};

export type MediaModelKey = keyof typeof MEDIA_MODELS;
export type MediaModel = MediaModelKey;
export const MEDIA_MODEL_KEYS = Object.keys(MEDIA_MODELS) as MediaModel[];

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

// Публичный URL сервера для доступа к медиа (Kie.ai и др. должны иметь возможность загрузить видео по URL)
export function getMediaPublicBaseUrl(): string {
  return (
    process.env.MEDIA_PUBLIC_BASE_URL ||
    process.env.APP_URL ||
    "http://localhost:4000"
  ).replace(/\/$/, "");
}

// Проверка: доступен ли URL снаружи (Kie.ai должен скачивать видео по ссылке)
export function isMediaUrlPubliclyAccessible(): boolean {
  const baseUrl = getMediaPublicBaseUrl();
  return (
    !baseUrl.includes("localhost") && !baseUrl.includes("127.0.0.1")
  );
}

// Пути для сохранения файлов
export const mediaStorageConfig = {
  basePath: "ai-media",
  previewsPath: "ai-media/previews",
  maxFileSize: 100 * 1024 * 1024, // 100MB (Kling Motion Control — видео до 100MB)
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
