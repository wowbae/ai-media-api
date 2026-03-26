// Payload mapping mechanism for Kie.ai unified provider
// Central mapping: modelKey -> endpoint -> payload schema
import type { MediaModel } from "../../interfaces";
import type { TaskStatusResult } from "../interfaces";

export type KieAiPayloadFamily =
    | "jobs_createTask"
    | "veo_generate"
    | "mj_generate";

export interface InputCardinality {
    type: "none" | "image_urls" | "image_input" | "fileUrls" | "video_urls";
    min: number;
    max: number;
}

export interface KieAiModelMapping {
    modelKey: MediaModel;
    endpoint: string;
    payloadFamily: KieAiPayloadFamily;
    inputCardinality: InputCardinality;
    statusEndpoint?: string;
    statusMap?: Record<string, TaskStatusResult["status"]>;
}

export interface FieldValidation {
    type: "string" | "number" | "boolean" | "array" | "object";
    enum?: readonly (string | number | boolean)[];
    min?: number;
    max?: number;
}

export interface PayloadSchema {
    required: string[];
    optional: string[];
    validations?: Record<string, FieldValidation>;
}

export const KIEAI_MODEL_MAPPING: Partial<Record<MediaModel, KieAiModelMapping>> =
    {
        // Kie.ai jobs/createTask family
        KLING_2_6_KIEAI: {
            modelKey: "KLING_2_6_KIEAI",
            endpoint: "/api/v1/jobs/createTask",
            payloadFamily: "jobs_createTask",
            inputCardinality: { type: "image_urls", min: 0, max: 1 },
        },
        KLING_3_0_KIEAI: {
            modelKey: "KLING_3_0_KIEAI",
            endpoint: "/api/v1/jobs/createTask",
            payloadFamily: "jobs_createTask",
            inputCardinality: { type: "image_urls", min: 0, max: 14 },
        },
        KLING_2_6_MOTION_CONTROL_KIEAI: {
            modelKey: "KLING_2_6_MOTION_CONTROL_KIEAI",
            endpoint: "/api/v1/jobs/createTask",
            payloadFamily: "jobs_createTask",
            inputCardinality: { type: "image_urls", min: 1, max: 1 },
        },
        SEEDANCE_1_5_PRO_KIEAI: {
            modelKey: "SEEDANCE_1_5_PRO_KIEAI",
            endpoint: "/api/v1/jobs/createTask",
            payloadFamily: "jobs_createTask",
            inputCardinality: { type: "image_urls", min: 0, max: 2 },
        },
        NANO_BANANA_PRO_KIEAI: {
            modelKey: "NANO_BANANA_PRO_KIEAI",
            endpoint: "/api/v1/jobs/createTask",
            payloadFamily: "jobs_createTask",
            inputCardinality: { type: "image_input", min: 0, max: 14 },
        },
        NANO_BANANA_2_KIEAI: {
            modelKey: "NANO_BANANA_2_KIEAI",
            endpoint: "/api/v1/jobs/createTask",
            payloadFamily: "jobs_createTask",
            inputCardinality: { type: "image_input", min: 0, max: 14 },
        },
        GROK_IMAGINE_IMAGE_TO_IMAGE_KIEAI: {
            modelKey: "GROK_IMAGINE_IMAGE_TO_IMAGE_KIEAI",
            endpoint: "/api/v1/jobs/createTask",
            payloadFamily: "jobs_createTask",
            inputCardinality: { type: "image_urls", min: 1, max: 1 },
        },
        GROK_IMAGINE_IMAGE_TO_VIDEO_KIEAI: {
            modelKey: "GROK_IMAGINE_IMAGE_TO_VIDEO_KIEAI",
            endpoint: "/api/v1/jobs/createTask",
            payloadFamily: "jobs_createTask",
            inputCardinality: { type: "image_urls", min: 1, max: 1 },
        },
        IMAGEN4_KIEAI: {
            modelKey: "IMAGEN4_KIEAI",
            endpoint: "/api/v1/jobs/createTask",
            payloadFamily: "jobs_createTask",
            inputCardinality: { type: "none", min: 0, max: 0 },
        },
        IMAGEN4_ULTRA_KIEAI: {
            modelKey: "IMAGEN4_ULTRA_KIEAI",
            endpoint: "/api/v1/jobs/createTask",
            payloadFamily: "jobs_createTask",
            inputCardinality: { type: "none", min: 0, max: 0 },
        },
        SEEDREAM_4_5_KIEAI: {
            modelKey: "SEEDREAM_4_5_KIEAI",
            endpoint: "/api/v1/jobs/createTask",
            payloadFamily: "jobs_createTask",
            inputCardinality: { type: "none", min: 0, max: 0 },
        },
        SEEDREAM_4_5_EDIT_KIEAI: {
            modelKey: "SEEDREAM_4_5_EDIT_KIEAI",
            endpoint: "/api/v1/jobs/createTask",
            payloadFamily: "jobs_createTask",
            inputCardinality: { type: "image_urls", min: 1, max: 14 },
        },
        SEEDREAM_5_0_LITE_KIEAI: {
            modelKey: "SEEDREAM_5_0_LITE_KIEAI",
            endpoint: "/api/v1/jobs/createTask",
            payloadFamily: "jobs_createTask",
            inputCardinality: { type: "none", min: 0, max: 0 },
        },
        SEEDREAM_5_0_LITE_EDIT_KIEAI: {
            modelKey: "SEEDREAM_5_0_LITE_EDIT_KIEAI",
            endpoint: "/api/v1/jobs/createTask",
            payloadFamily: "jobs_createTask",
            inputCardinality: { type: "image_urls", min: 1, max: 14 },
        },
        ELEVENLABS_MULTILINGUAL_V2_KIEAI: {
            modelKey: "ELEVENLABS_MULTILINGUAL_V2_KIEAI",
            endpoint: "/api/v1/jobs/createTask",
            payloadFamily: "jobs_createTask",
            inputCardinality: { type: "none", min: 0, max: 0 },
        },
        // Midjourney special endpoint
        MIDJOURNEY: {
            modelKey: "MIDJOURNEY",
            endpoint: "/api/v1/mj/generate",
            statusEndpoint: "/api/v1/mj/record-info",
            payloadFamily: "mj_generate",
            inputCardinality: { type: "fileUrls", min: 0, max: 14 },
        },
        // Veo special endpoint
        VEO_3_1_FAST_KIEAI: {
            modelKey: "VEO_3_1_FAST_KIEAI",
            endpoint: "/api/v1/veo/generate",
            statusEndpoint: "/api/v1/veo/record-info",
            payloadFamily: "veo_generate",
            inputCardinality: { type: "image_urls", min: 0, max: 2 },
        },
    };

const KIEAI_SCHEMA_BY_FAMILY: Record<KieAiPayloadFamily, PayloadSchema> = {
    jobs_createTask: {
        required: ["model", "input"],
        optional: ["callBackUrl"],
        validations: {
            model: { type: "string" },
            input: { type: "object" },
            callBackUrl: { type: "string" },
        },
    },
    veo_generate: {
        required: ["prompt", "model", "aspectRatio", "generationType"],
        optional: ["enableTranslation", "imageUrls", "seeds"],
        validations: {
            prompt: { type: "string" },
            model: { type: "string" },
            aspectRatio: { type: "string", enum: ["16:9", "9:16"] },
            generationType: {
                type: "string",
                enum: [
                    "TEXT_2_VIDEO",
                    "FIRST_AND_LAST_FRAMES_2_VIDEO",
                    "REFERENCE_2_VIDEO",
                    "EXTEND_VIDEO",
                ],
            },
            enableTranslation: { type: "boolean" },
            imageUrls: { type: "array" },
            seeds: { type: "number" },
        },
    },
    mj_generate: {
        required: ["taskType", "speed", "prompt", "aspectRatio", "version"],
        optional: ["fileUrls"],
        validations: {
            taskType: { type: "string" },
            speed: { type: "string" },
            prompt: { type: "string" },
            aspectRatio: { type: "string" },
            version: { type: "string" },
            fileUrls: { type: "array" },
        },
    },
};

export function getKieAiModelMapping(
    model: MediaModel,
): KieAiModelMapping | undefined {
    return KIEAI_MODEL_MAPPING[model];
}

export function getKieAiPayloadSchema(mapping: KieAiModelMapping): PayloadSchema {
    return KIEAI_SCHEMA_BY_FAMILY[mapping.payloadFamily];
}

