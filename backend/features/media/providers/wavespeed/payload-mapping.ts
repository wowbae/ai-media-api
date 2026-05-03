// Payload Mapping Registry для Wavespeed провайдера
// Центральная таблица соответствий: modelKey -> externalEndpoint -> payloadSchema -> builder

import type { MediaModel } from "../../config";

// Типы payload family для Wavespeed
export type WavespeedPayloadFamily =
    | "wan2_2_i2v" // WAN 2.2 Image-to-Video 720p
    | "wan2_2_i2v_lora" // WAN 2.2 Image-to-Video LoRA
    | "kling_video_o1" // Kling Video O1
    | "z_image_turbo_lora" // Z-Image Turbo LoRA
    | "z_image_i2i_lora" // Z-Image Turbo Image-to-Image LoRA
    | "z_image_lora_trainer" // Z-Image LoRA Trainer
    | "qwen_image_edit" // Qwen Image 2.0 Pro Edit
    | "seedream_v4_5_edit" // Seedream V4.5 Edit Sequential
    | "flux_2_max_edit" // FLUX 2 Max Edit (BFL)
    | "seedance_2_0_t2v" // Seedance 2.0 Text-to-Video
    | "gpt_image_2_edit"; // OpenAI GPT Image 2 Edit

// Базовая схема payload с белым списком полей
export interface PayloadSchema {
    required: string[];
    optional: string[];
    // Дополнительные валидации для полей
    validations?: Record<string, PayloadFieldValidation>;
}

export interface PayloadFieldValidation {
    type?: "string" | "number" | "integer" | "boolean" | "array" | "object";
    min?: number;
    max?: number;
    enum?: (string | number)[];
    pattern?: string;
    minItems?: number;
    maxItems?: number;
}

// Маппинг modelKey -> endpoint + payload family
export interface ModelEndpointMapping {
    modelKey: MediaModel;
    externalEndpoint: string;
    payloadFamily: WavespeedPayloadFamily;
    inputCardinality: {
        min: number;
        max: number;
        type: "image" | "video" | "zip" | "none";
    };
}

// Registry всех моделей Wavespeed
export const WAVESPEED_MODEL_MAPPING: Record<MediaModel, ModelEndpointMapping> =
    {
        // Video модели
        WAN_2_2_IMAGE_TO_VIDEO_WAVESPEED: {
            modelKey: "WAN_2_2_IMAGE_TO_VIDEO_WAVESPEED",
            externalEndpoint: "wavespeed-ai/wan-2.2/i2v-720p",
            payloadFamily: "wan2_2_i2v",
            inputCardinality: {
                min: 1,
                max: 2,
                type: "image",
            },
        },
        WAN_2_2_IMAGE_TO_VIDEO_LORA_WAVESPEED: {
            modelKey: "WAN_2_2_IMAGE_TO_VIDEO_LORA_WAVESPEED",
            externalEndpoint: "wavespeed-ai/wan-2.2/image-to-video-lora",
            payloadFamily: "wan2_2_i2v_lora",
            inputCardinality: {
                min: 1,
                max: 2,
                type: "image",
            },
        },
        KLING_VIDEO_O1_WAVESPEED: {
            modelKey: "KLING_VIDEO_O1_WAVESPEED",
            externalEndpoint: "kwaivgi/kling-video-o1-std/reference-to-video",
            payloadFamily: "kling_video_o1",
            inputCardinality: {
                min: 1,
                max: 10,
                type: "image",
            },
        },
        // Image модели
        Z_IMAGE_TURBO_LORA_WAVESPEED: {
            modelKey: "Z_IMAGE_TURBO_LORA_WAVESPEED",
            externalEndpoint: "wavespeed-ai/z-image/turbo-lora",
            payloadFamily: "z_image_turbo_lora",
            inputCardinality: {
                min: 0,
                max: 0,
                type: "none",
            },
        },
        Z_IMAGE_TURBO_IMAGE_TO_IMAGE_WAVESPEED: {
            modelKey: "Z_IMAGE_TURBO_IMAGE_TO_IMAGE_WAVESPEED",
            externalEndpoint: "wavespeed-ai/z-image-turbo/image-to-image-lora",
            payloadFamily: "z_image_i2i_lora",
            inputCardinality: {
                min: 1,
                max: 1,
                type: "image",
            },
        },
        Z_IMAGE_LORA_TRAINER_WAVESPEED: {
            modelKey: "Z_IMAGE_LORA_TRAINER_WAVESPEED",
            externalEndpoint: "wavespeed-ai/z-image-lora-trainer",
            payloadFamily: "z_image_lora_trainer",
            inputCardinality: {
                min: 1,
                max: 1,
                type: "zip",
            },
        },
        QWEN_IMAGE_2_0_PRO_EDIT_WAVESPEED: {
            modelKey: "QWEN_IMAGE_2_0_PRO_EDIT_WAVESPEED",
            externalEndpoint: "wavespeed-ai/qwen-image-2.0-pro/edit",
            payloadFamily: "qwen_image_edit",
            inputCardinality: {
                min: 1,
                max: 14,
                type: "image",
            },
        },
        SEEDREAM_V4_5_EDIT_SEQUENTIAL_WAVESPEED: {
            modelKey: "SEEDREAM_V4_5_EDIT_SEQUENTIAL_WAVESPEED",
            externalEndpoint: "bytedance/seedream-v4.5/edit-sequential",
            payloadFamily: "seedream_v4_5_edit",
            inputCardinality: {
                min: 1,
                max: 14,
                type: "image",
            },
        },
        FLUX_2_MAX_EDIT_WAVESPEED: {
            modelKey: "FLUX_2_MAX_EDIT_WAVESPEED",
            externalEndpoint: "wavespeed-ai/flux-2-max/edit",
            payloadFamily: "flux_2_max_edit",
            inputCardinality: {
                min: 1,
                max: 3,
                type: "image",
            },
        },
        SEEDANCE_2_0_TEXT_TO_VIDEO_WAVESPEED: {
            modelKey: "SEEDANCE_2_0_TEXT_TO_VIDEO_WAVESPEED",
            externalEndpoint: "bytedance/seedance-2.0/text-to-video",
            payloadFamily: "seedance_2_0_t2v",
            inputCardinality: {
                min: 0,
                max: 0,
                type: "none",
            },
        },
        GPT_IMAGE_2_EDIT_WAVESPEED: {
            modelKey: "GPT_IMAGE_2_EDIT_WAVESPEED",
            externalEndpoint: "openai/gpt-image-2/edit",
            payloadFamily: "gpt_image_2_edit",
            inputCardinality: {
                min: 1,
                max: 1,
                type: "image",
            },
        },
    } as const;

// Схемы payload для каждого family
export const PAYLOAD_SCHEMAS: Record<WavespeedPayloadFamily, PayloadSchema> = {
    // WAN 2.2 I2V 720p: image, prompt, duration, resolution, seed, negative_prompt, last_image
    wan2_2_i2v: {
        required: ["prompt", "image", "duration"],
        optional: ["negative_prompt", "last_image", "seed"],
        validations: {
            duration: {
                type: "integer",
                enum: ["5", "8"],
            },
            seed: {
                type: "integer",
            },
        },
    },
    // WAN 2.2 I2V LoRA: то же + loras, resolution
    wan2_2_i2v_lora: {
        required: ["prompt", "image", "duration"],
        optional: [
            "negative_prompt",
            "last_image",
            "seed",
            "loras",
            "resolution",
        ],
        validations: {
            duration: {
                type: "integer",
                enum: ["5", "8"],
            },
            seed: {
                type: "integer",
            },
            loras: {
                type: "array",
                minItems: 1,
                maxItems: 3,
            },
            resolution: {
                type: "string",
                enum: ["720p"],
            },
        },
    },
    // Kling Video O1: prompt, image, images, duration, safety_checker
    kling_video_o1: {
        required: ["prompt", "image", "images", "duration"],
        optional: ["safety_checker"],
        validations: {
            duration: {
                type: "integer",
                min: 3,
                max: 10,
            },
            images: {
                type: "array",
                minItems: 1,
                maxItems: 10,
            },
            safety_checker: {
                type: "boolean",
            },
        },
    },
    // Z-Image Turbo LoRA: prompt, size, seed, loras, safety_checker
    z_image_turbo_lora: {
        required: ["prompt"],
        optional: ["size", "seed", "loras", "safety_checker"],
        validations: {
            seed: {
                type: "integer",
            },
            loras: {
                type: "array",
                minItems: 1,
                maxItems: 3,
            },
            safety_checker: {
                type: "boolean",
            },
        },
    },
    // Z-Image Turbo Image-to-Image LoRA: prompt, image, images, size, seed, strength, loras, safety_checker
    z_image_i2i_lora: {
        required: ["prompt", "image", "images", "strength"],
        optional: ["size", "seed", "loras", "safety_checker"],
        validations: {
            seed: {
                type: "integer",
            },
            strength: {
                type: "number",
                min: 0,
                max: 1,
            },
            images: {
                type: "array",
                minItems: 1,
                maxItems: 1,
            },
            loras: {
                type: "array",
                maxItems: 3,
            },
            safety_checker: {
                type: "boolean",
            },
        },
    },
    // Z-Image LoRA Trainer: data, trigger_word, steps, learning_rate, lora_rank, safety_checker
    z_image_lora_trainer: {
        required: ["data"],
        optional: [
            "trigger_word",
            "steps",
            "learning_rate",
            "lora_rank",
            "safety_checker",
        ],
        validations: {
            data: {
                type: "string",
            },
            steps: {
                type: "integer",
                min: 1,
            },
            learning_rate: {
                type: "number",
                min: 0.00001,
                max: 1,
            },
            lora_rank: {
                type: "integer",
                min: 1,
            },
            safety_checker: {
                type: "boolean",
            },
        },
    },
    // Qwen Image 2.0 Pro Edit: prompt, image, images, size, seed, safety_checker
    qwen_image_edit: {
        required: ["prompt", "image", "images"],
        optional: ["size", "seed", "safety_checker"],
        validations: {
            seed: {
                type: "integer",
            },
            images: {
                type: "array",
                minItems: 1,
                maxItems: 14,
            },
            safety_checker: {
                type: "boolean",
            },
        },
    },
    // Seedream V4.5 Edit Sequential: prompt, image, images, size, seed, safety_checker
    seedream_v4_5_edit: {
        required: ["prompt", "image", "images"],
        optional: ["size", "seed", "safety_checker"],
        validations: {
            seed: {
                type: "integer",
            },
            images: {
                type: "array",
                minItems: 1,
                maxItems: 14,
            },
            safety_checker: {
                type: "boolean",
            },
        },
    },
    flux_2_max_edit: {
        required: ["prompt", "images"],
        optional: ["enable_base64_output", "enable_sync_mode", "seed", "size"],
        validations: {
            seed: {
                type: "integer",
            },
            images: {
                type: "array",
                minItems: 1,
                maxItems: 3,
            },
            enable_base64_output: {
                type: "boolean",
            },
            enable_sync_mode: {
                type: "boolean",
            },
        },
    },
    seedance_2_0_t2v: {
        required: ["prompt"],
        optional: [
            "duration",
            "seed",
            "aspect_ratio",
            "resolution",
            "enable_web_search",
            "nsfw_checker",
        ],
        validations: {
            prompt: {
                type: "string",
            },
            duration: {
                type: "integer",
                enum: [5, 10],
            },
            seed: {
                type: "integer",
            },
            aspect_ratio: {
                type: "string",
                enum: ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"],
            },
            resolution: {
                type: "string",
                enum: ["480p", "720p", "1080p"],
            },
            enable_web_search: {
                type: "boolean",
            },
            nsfw_checker: {
                type: "boolean",
            },
        },
    },
    gpt_image_2_edit: {
        required: ["prompt", "image"],
        optional: ["n", "size", "seed", "nsfw_checker"],
        validations: {
            prompt: {
                type: "string",
            },
            image: {
                type: "string",
            },
            n: {
                type: "integer",
                min: 1,
                max: 10,
            },
            size: {
                type: "string",
                enum: ["1024x1024", "1024x1792", "1792x1024"],
            },
            seed: {
                type: "integer",
            },
            nsfw_checker: {
                type: "boolean",
            },
        },
    },
};

// Helper для получения mapping по modelKey
export function getWavespeedModelMapping(
    modelKey: MediaModel,
): ModelEndpointMapping | undefined {
    return WAVESPEED_MODEL_MAPPING[modelKey];
}

// Helper для получения схемы payload по family
export function getPayloadSchema(
    family: WavespeedPayloadFamily,
): PayloadSchema {
    return PAYLOAD_SCHEMAS[family];
}

// Helper для получения endpoint по modelKey
export function resolveWavespeedEndpoint(
    modelKey: MediaModel,
): string | undefined {
    const mapping = WAVESPEED_MODEL_MAPPING[modelKey];
    return mapping?.externalEndpoint;
}

// Helper для получения payload family по modelKey
export function resolvePayloadFamily(
    modelKey: MediaModel,
): WavespeedPayloadFamily | undefined {
    const mapping = WAVESPEED_MODEL_MAPPING[modelKey];
    return mapping?.payloadFamily;
}
