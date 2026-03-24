export const APP_MODES = {
    DEFAULT: "default",
    AI_MODEL: "ai-model",
} as const;

export type AppMode = (typeof APP_MODES)[keyof typeof APP_MODES];

export const AI_MODEL_ALLOWED_MODELS = [
    "NANO_BANANA_2_KIEAI",
    "Z_IMAGE_TURBO_LORA_WAVESPEED",
    "GROK_IMAGINE_IMAGE_TO_IMAGE_KIEAI",
    "GROK_IMAGINE_IMAGE_TO_VIDEO_KIEAI",
] as const;
