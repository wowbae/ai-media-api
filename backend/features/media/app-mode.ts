import type { MediaModel } from "./interfaces";

export const APP_MODES = {
    DEFAULT: "default",
    AI_MODEL: "ai-model",
} as const;

export type AppMode = (typeof APP_MODES)[keyof typeof APP_MODES];

export const AI_MODEL_ALLOWED_MODELS: readonly MediaModel[] = [
    "NANO_BANANA_2_KIEAI",
    "FLUX_2_MAX_EDIT_WAVESPEED",
    "Z_IMAGE_TURBO_LORA_WAVESPEED",
    "GROK_IMAGINE_IMAGE_TO_VIDEO_KIEAI",
    "SEEDREAM_V4_5_EDIT_SEQUENTIAL_WAVESPEED",
    "Z_IMAGE_TURBO_IMAGE_TO_IMAGE_WAVESPEED",
    "Z_IMAGE_LORA_TRAINER_WAVESPEED",
    "QWEN_IMAGE_2_0_PRO_EDIT_WAVESPEED",
    "WAN_2_2_IMAGE_TO_VIDEO_LORA_WAVESPEED",
    "WAN_2_2_IMAGE_TO_VIDEO_WAVESPEED",
    "SEEDANCE_2_0_TEXT_TO_VIDEO_WAVESPEED",
    "GPT_IMAGE_2_EDIT_WAVESPEED",
] as const;

export function parseAppMode(value: unknown): AppMode {
    return value === APP_MODES.AI_MODEL
        ? APP_MODES.AI_MODEL
        : APP_MODES.DEFAULT;
}

export function isAiModelMode(mode: AppMode): boolean {
    return mode === APP_MODES.AI_MODEL;
}

export function isModelAllowedForMode(
    model: MediaModel,
    mode: AppMode,
): boolean {
    if (!isAiModelMode(mode)) return true;
    return AI_MODEL_ALLOWED_MODELS.includes(model);
}
