// Typed Payload Builders для Wavespeed провайдера
// Каждый builder строит payload ровно под схему конкретного endpoint

import type { MediaModel } from "../../config";
import type { GenerateParams } from "../interfaces";
import type { GenerationLoraInput } from "../../interfaces";
import {
    type WavespeedPayloadFamily,
    getWavespeedModelMapping,
    getPayloadSchema,
} from "./payload-mapping";
import { getMediaPublicBaseUrl } from "../../config";

// Вспомогательные типы для typed payload
export interface Wan2_2I2vPayload {
    prompt: string;
    image: string;
    duration: number;
    negative_prompt?: string;
    last_image?: string;
    seed?: number;
}

export interface Wan2_2I2vLoraPayload extends Wan2_2I2vPayload {
    loras: Array<{ path: string; scale: number }>;
    resolution: "720p";
}

export interface KlingVideoO1Payload {
    prompt: string;
    image: string;
    images: string[];
    duration: number;
    safety_checker: false;
}

export interface ZImageTurboLoraPayload {
    prompt: string;
    size: string;
    seed?: number;
    loras: Array<{ path: string; scale?: number }>;
    safety_checker: false;
}

export interface ZImageI2iLoraPayload {
    prompt: string;
    image: string;
    images: string[];
    size: string;
    seed?: number;
    safety_checker: false;
}

export interface ZImageLoraTrainerPayload {
    data: string;
    trigger_word?: string;
    steps?: number;
    learning_rate?: number;
    lora_rank?: number;
    safety_checker: false;
}

export interface QwenImageEditPayload {
    prompt: string;
    image: string;
    images: string[];
    size: string;
    seed?: number;
    safety_checker: false;
}

export interface SeedreamV4_5EditPayload {
    prompt: string;
    image: string;
    images: string[];
    size: string;
    seed?: number;
    safety_checker: false;
}

// Union тип для всех payload
export type WavespeedPayload =
    | Wan2_2I2vPayload
    | Wan2_2I2vLoraPayload
    | KlingVideoO1Payload
    | ZImageTurboLoraPayload
    | ZImageI2iLoraPayload
    | ZImageLoraTrainerPayload
    | QwenImageEditPayload
    | SeedreamV4_5EditPayload;

// Аспект-рейшио в размер для image моделей
const ASPECT_RATIO_TO_SIZE: Record<string, string> = {
    "1:1": "1024*1024",
    "16:9": "1280*720",
    "9:16": "720*1280",
    "4:3": "1024*768",
    "3:4": "768*1024",
    "3:2": "1152*768",
    "2:3": "768*1152",
};

// Seedream v4.5 edit требует минимум 3,686,400 пикселей
const SEEDREAM_SEQUENTIAL_ASPECT_RATIO_TO_SIZE: Record<string, string> = {
    "1:1": "2048*2048",
    "16:9": "2560*1440",
    "9:16": "1440*2560",
    "4:3": "2304*1728",
    "3:4": "1728*2304",
    "3:2": "2496*1664",
    "2:3": "1664*2496",
    "21:9": "2940*1260",
};

// Нормализация URL для локальных файлов
function normalizePublicMediaFileUrl(rawPath: string): string {
    const mediaPrefix = "/media-files/";
    const publicBaseUrl = getMediaPublicBaseUrl();

    if (rawPath.startsWith(mediaPrefix)) {
        return `${publicBaseUrl}${rawPath}`;
    }

    try {
        const parsed = new URL(rawPath);
        if (parsed.pathname.startsWith(mediaPrefix)) {
            return `${publicBaseUrl}${parsed.pathname}`;
        }
    } catch {
        // not an absolute URL, keep as is
    }

    return rawPath;
}

// Парсинг seed
function parseSeed(seed?: string | number): number | undefined {
    if (seed === undefined || seed === null || String(seed).trim() === "") {
        return undefined;
    }
    const parsed = typeof seed === "number" ? seed : Number.parseInt(seed, 10);
    if (Number.isNaN(parsed)) return undefined;
    return parsed;
}

// Маппинг duration для WAN 2.2
function mapDurationForWan2_2(
    model: MediaModel,
    duration?: number,
): number {
    if (
        model === "WAN_2_2_IMAGE_TO_VIDEO_LORA_WAVESPEED" ||
        model === "WAN_2_2_IMAGE_TO_VIDEO_WAVESPEED"
    ) {
        return duration === 8 ? 8 : 5;
    }
    // Fallback для Kling
    const numericDuration =
        typeof duration === "string" ? Number.parseInt(duration, 10) : duration;
    if (
        typeof numericDuration === "number" &&
        !Number.isNaN(numericDuration) &&
        numericDuration >= 3 &&
        numericDuration <= 10
    ) {
        return numericDuration;
    }
    return 5;
}

// Builder для WAN 2.2 I2V 720p
export function buildWan2_2I2vPayload(
    params: GenerateParams,
): Wan2_2I2vPayload {
    const imageUrls = params.inputFiles?.slice(0, 2) || [];
    return {
        prompt: params.prompt,
        image: normalizePublicMediaFileUrl(imageUrls[0]),
        duration: mapDurationForWan2_2(params.model, params.duration),
        ...(params.negativePrompt &&
            params.negativePrompt.trim().length > 0 && {
                negative_prompt: params.negativePrompt.trim(),
            }),
        ...(imageUrls[1] && { last_image: normalizePublicMediaFileUrl(imageUrls[1]) }),
        ...(parseSeed(params.seed) !== undefined && {
            seed: parseSeed(params.seed),
        }),
    };
}

// Builder для WAN 2.2 I2V LoRA
export function buildWan2_2I2vLoraPayload(
    params: GenerateParams,
): Wan2_2I2vLoraPayload {
    const imageUrls = params.inputFiles?.slice(0, 2) || [];
    const basePayload = buildWan2_2I2vPayload(params);
    
    return {
        ...basePayload,
        resolution: "720p",
        loras: (params.loras || [])
            .slice(0, 3)
            .filter(
                (lora) =>
                    lora &&
                    typeof lora.path === "string" &&
                    lora.path.trim().length > 0,
            )
            .map((lora) => ({
                path: normalizePublicMediaFileUrl(lora.path),
                scale: typeof lora.scale === "number" ? lora.scale : 1,
            })),
    };
}

// Builder для Kling Video O1
export function buildKlingVideoO1Payload(
    params: GenerateParams,
    imageUrls: string[],
): KlingVideoO1Payload {
    return {
        prompt: params.prompt,
        image: normalizePublicMediaFileUrl(imageUrls[0]),
        images: imageUrls.map((url) => normalizePublicMediaFileUrl(url)),
        duration: mapDurationForWan2_2(params.model, params.duration),
        safety_checker: false,
    };
}

// Builder для Z-Image Turbo LoRA
export function buildZImageTurboLoraPayload(
    params: GenerateParams,
): ZImageTurboLoraPayload {
    const mappedSize = params.aspectRatio
        ? ASPECT_RATIO_TO_SIZE[params.aspectRatio]
        : ASPECT_RATIO_TO_SIZE["1:1"];

    return {
        prompt: params.prompt,
        size: mappedSize,
        seed: parseSeed(params.seed),
        safety_checker: false,
        loras: (params.loras || []).slice(0, 3).map((lora) => ({
            path: normalizePublicMediaFileUrl(lora.path),
            scale: lora.scale,
        })),
    };
}

// Builder для Z-Image Turbo Image-to-Image LoRA
export function buildZImageI2iLoraPayload(
    params: GenerateParams,
): ZImageI2iLoraPayload {
    const mappedSize = params.aspectRatio
        ? ASPECT_RATIO_TO_SIZE[params.aspectRatio]
        : ASPECT_RATIO_TO_SIZE["1:1"];
    const firstInput = params.inputFiles?.[0];
    if (!firstInput) {
        throw new Error(
            "Для Z-Image Turbo Image-to-Image нужно входное изображение",
        );
    }
    const normalizedInput = normalizePublicMediaFileUrl(firstInput);

    return {
        prompt: params.prompt,
        image: normalizedInput,
        images: [normalizedInput],
        size: mappedSize,
        seed: parseSeed(params.seed),
        safety_checker: false,
    };
}

// Builder для Z-Image LoRA Trainer
export function buildZImageLoraTrainerPayload(
    params: GenerateParams,
    uploadedArchiveUrl: string,
): ZImageLoraTrainerPayload {
    const settings = params as GenerateParams & {
        triggerWord?: string;
        trainingSteps?: number;
        learningRate?: number;
        loraRank?: number;
    };

    return {
        data: uploadedArchiveUrl,
        trigger_word:
            settings.triggerWord || params.prompt?.trim() || undefined,
        steps: settings.trainingSteps,
        learning_rate: settings.learningRate,
        lora_rank: settings.loraRank,
        safety_checker: false,
    };
}

// Builder для Qwen Image 2.0 Pro Edit
export function buildQwenImageEditPayload(
    params: GenerateParams,
): QwenImageEditPayload {
    const mappedSize = params.aspectRatio
        ? ASPECT_RATIO_TO_SIZE[params.aspectRatio]
        : ASPECT_RATIO_TO_SIZE["1:1"];
    const normalizedInputs = (params.inputFiles || []).map((input) =>
        normalizePublicMediaFileUrl(input),
    );

    if (!normalizedInputs.length) {
        throw new Error(
            "Для Qwen Image Edit нужно минимум одно входное изображение",
        );
    }

    return {
        prompt: params.prompt,
        image: normalizedInputs[0],
        images: normalizedInputs,
        size: mappedSize,
        seed: parseSeed(params.seed),
        safety_checker: false,
    };
}

// Builder для Seedream V4.5 Edit Sequential
export function buildSeedreamV4_5EditPayload(
    params: GenerateParams,
): SeedreamV4_5EditPayload {
    const mappedSize = params.aspectRatio
        ? SEEDREAM_SEQUENTIAL_ASPECT_RATIO_TO_SIZE[params.aspectRatio]
        : SEEDREAM_SEQUENTIAL_ASPECT_RATIO_TO_SIZE["1:1"];
    const normalizedInputs = (params.inputFiles || []).map((input) =>
        normalizePublicMediaFileUrl(input),
    );

    if (!normalizedInputs.length) {
        throw new Error(
            "Для Seedream V4.5 Edit Sequential нужно минимум одно входное изображение",
        );
    }

    return {
        prompt: params.prompt,
        image: normalizedInputs[0],
        images: normalizedInputs,
        size: mappedSize,
        seed: parseSeed(params.seed),
        safety_checker: false,
    };
}

// Главный builder: выбирает нужный builder по modelKey
export function buildWavespeedPayload(
    model: MediaModel,
    params: GenerateParams,
    uploadedArchiveUrl?: string,
): WavespeedPayload {
    const mapping = getWavespeedModelMapping(model);
    if (!mapping) {
        throw new Error(`Неизвестная модель Wavespeed: ${model}`);
    }

    const { payloadFamily } = mapping;

    switch (payloadFamily) {
        case "wan2_2_i2v":
            return buildWan2_2I2vPayload(params);
        case "wan2_2_i2v_lora":
            return buildWan2_2I2vLoraPayload(params);
        case "kling_video_o1": {
            const imageUrls = params.inputFiles?.slice(0, 10) || [];
            if (!imageUrls.length) {
                throw new Error(
                    "Kling Video O1 требует минимум 1 reference изображение",
                );
            }
            return buildKlingVideoO1Payload(params, imageUrls);
        }
        case "z_image_turbo_lora":
            return buildZImageTurboLoraPayload(params);
        case "z_image_i2i_lora":
            return buildZImageI2iLoraPayload(params);
        case "z_image_lora_trainer":
            if (!uploadedArchiveUrl) {
                throw new Error(
                    "Z-Image LoRA Trainer требует uploaded archive URL",
                );
            }
            return buildZImageLoraTrainerPayload(params, uploadedArchiveUrl);
        case "qwen_image_edit":
            return buildQwenImageEditPayload(params);
        case "seedream_v4_5_edit":
            return buildSeedreamV4_5EditPayload(params);
        default:
            throw new Error(`Неподдерживаемый payload family: ${payloadFamily}`);
    }
}
