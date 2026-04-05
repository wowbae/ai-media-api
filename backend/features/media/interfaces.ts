// Интерфейсы для медиа-генерации
// Типы теперь строковые вместо enum

export type MediaModel =
    | "MIDJOURNEY"
    | "VEO_3_1_FAST_KIEAI"
    | "NANO_BANANA_PRO_LAOZHANG"
    | "NANO_BANANA_2_KIEAI"
    | "GROK_IMAGINE_IMAGE_TO_IMAGE_KIEAI"
    | "GROK_IMAGINE_IMAGE_TO_VIDEO_KIEAI"
    | "KLING_2_6_KIEAI"
    | "KLING_3_0_KIEAI"
    | "NANO_BANANA_PRO_KIEAI"
    | "IMAGEN4_KIEAI"
    | "IMAGEN4_ULTRA_KIEAI"
    | "SEEDREAM_4_5_KIEAI"
    | "SEEDREAM_4_5_EDIT_KIEAI"
    | "SEEDREAM_5_0_LITE_KIEAI"
    | "SEEDREAM_5_0_LITE_EDIT_KIEAI"
    | "ELEVENLABS_MULTILINGUAL_V2_KIEAI"
    | "KLING_VIDEO_O1_WAVESPEED"
    | "Z_IMAGE_TURBO_LORA_WAVESPEED"
    | "Z_IMAGE_TURBO_IMAGE_TO_IMAGE_WAVESPEED"
    | "Z_IMAGE_LORA_TRAINER_WAVESPEED"
    | "QWEN_IMAGE_2_0_PRO_EDIT_WAVESPEED"
    | "SEEDREAM_V4_5_EDIT_SEQUENTIAL_WAVESPEED"
    | "WAN_2_2_IMAGE_TO_VIDEO_LORA_WAVESPEED"
    | "WAN_2_2_IMAGE_TO_VIDEO_WAVESPEED"
    | "SEEDANCE_1_5_PRO_KIEAI"
    | "KLING_2_6_MOTION_CONTROL_KIEAI";

export interface GenerationLoraInput {
    path: string;
    scale?: number;
}

export type MediaType = "IMAGE" | "VIDEO" | "AUDIO";

export type RequestStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface GenerateMediaRequest {
    chatId: number;
    prompt: string;
    enhancedPrompt?: string;
    model?: MediaModel;
    appMode?: "default" | "ai-model";
    inputFiles?: string[]; // base64 или URL файлов для image-to-image
    format?: "1:1" | "9:16" | "16:9"; // Формат изображения для NANO_BANANA
    quality?: "1k" | "2k" | "4k"; // Качество изображения для NANO_BANANA
    videoQuality?: "480p" | "720p" | "1080p"; // Качество видео для видео-моделей
    duration?: number; // Длина видео в секундах (1-20) для видео-моделей
    ar?: "16:9" | "9:16"; // Формат видео для Veo
    generationType?:
        | "TEXT_2_VIDEO"
        | "FIRST_AND_LAST_FRAMES_2_VIDEO"
        | "REFERENCE_2_VIDEO"
        | "EXTEND_VIDEO"; // Режим генерации для Veo 3.1
    originalTaskId?: string; // taskId оригинального видео для режима EXTEND_VIDEO
    sound?: boolean; // Звук для Kling 2.6 / generate_audio для Seedance 1.5 Pro
    fixedLens?: boolean; // Флаг fixed_lens для Seedance 1.5 Pro
    outputFormat?: "png" | "jpg"; // Формат выход ного файла для Nano Banana Pro (Kie.ai)
    negativePrompt?: string; // Imagen4 (Kie), WAN 2.2 I2V (Wavespeed); опционально Kling 2.5
    seed?: string | number; // Seed для Imagen4
    cfgScale?: number; // CFG scale для Kling 2.5 Turbo Pro
    tailImageUrl?: string; // Tail frame image для Kling 2.5 Turbo Pro (image-to-video)
    /** Image-to-image strength (Z-Image Turbo I2I LoRA, Wavespeed), 0–1; выше — сильнее отход от входного изображения */
    strength?: number;
    loras?: GenerationLoraInput[]; // LoRA adapters для Wavespeed Z-Image Turbo LoRA (до 3)
    // Параметры для ElevenLabs Multilingual v2
    voice?: string; // Голос для TTS (по умолчанию "Rachel")
    stability?: number; // Стабильность (0-1, по умолчанию 0.5)
    similarityBoost?: number; // Усиление сходства (0-1, по умолчанию 0.75)
    speed?: number; // Скорость (0.5-2, по умолчанию 1)
    languageCode?: string; // Код языка (опционально)
    // Параметры для Kling 3.0
    mode?: "std" | "pro"; // Режим генерации для Kling 3.0
    multiShots?: boolean; // Multi-shot режим для Kling 3.0
    // Параметры для Kling 2.6 Motion Control
    inputVideoFiles?: string[]; // URL видео для motion reference
    characterOrientation?: "image" | "video"; // image: макс 10с, video: макс 30с
    triggerWord?: string; // Trigger word для Z-Image LoRA Trainer
}

export interface GenerateMediaResponse {
    requestId: number;
    status: RequestStatus;
    message: string;
}

export interface MediaRequestWithFiles {
    id: number;
    chatId: number;
    prompt: string;
    status: RequestStatus;
    inputFiles: string[];
    errorMessage: string | null;
    createdAt: Date;
    completedAt: Date | null;
    appMode?: "default" | "ai-model";
    files: MediaFileInfo[];
}

export interface MediaFileInfo {
    id: number;
    type: MediaType;
    filename: string;
    path: string | null; // Локальный путь (для VIDEO и отображения IMAGE)
    url: string | null; // URL на imgbb (для IMAGE, используется для отправки в нейросеть)
    previewPath: string | null; // Локальный путь превью (для VIDEO и отображения IMAGE)
    previewUrl: string | null; // URL превью на imgbb (для IMAGE, создается асинхронно)
    size: number | null;
    width: number | null;
    height: number | null;
    createdAt: Date;
}

export interface CreateChatRequest {
    name: string;
    model?: MediaModel;
    settings?: Record<string, unknown>;
    appMode?: "default" | "ai-model";
}

export interface UpdateChatRequest {
    name?: string;
    model?: MediaModel;
    settings?: Record<string, unknown>;
}

export interface MediaChatWithRequests {
    id: number;
    name: string;
    model: MediaModel;
    settings: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
    requests: MediaRequestWithFiles[];
}

export interface PaginationParams {
    page?: number;
    limit?: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
