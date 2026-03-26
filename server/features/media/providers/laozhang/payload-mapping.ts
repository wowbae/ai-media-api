// Payload mapping mechanism for LaoZhang provider
import type { MediaModel } from "../../interfaces";

export type LaoZhangPayloadFamily =
    | "google_native_image"
    | "openai_compatible_chat";

export interface FieldValidation {
    type: "string" | "number" | "boolean" | "array" | "object";
}

export interface PayloadSchema {
    required: string[];
    optional: string[];
    validations?: Record<string, FieldValidation>;
}

export interface LaoZhangModelMapping {
    modelKey: MediaModel;
    payloadFamily: LaoZhangPayloadFamily;
}

export const LAOZHANG_MODEL_MAPPING: Partial<
    Record<MediaModel, LaoZhangModelMapping>
> = {
    NANO_BANANA_PRO_LAOZHANG: {
        modelKey: "NANO_BANANA_PRO_LAOZHANG",
        payloadFamily: "google_native_image",
    },
};

export const LAOZHANG_SCHEMA_BY_FAMILY: Record<LaoZhangPayloadFamily, PayloadSchema> =
    {
        google_native_image: {
            required: ["contents"],
            optional: ["generationConfig"],
            validations: {
                contents: { type: "array" },
                generationConfig: { type: "object" },
            },
        },
        openai_compatible_chat: {
            required: ["model", "messages"],
            optional: ["modalities", "aspect_ratio", "resolution", "ar"],
            validations: {
                model: { type: "string" },
                messages: { type: "array" },
                modalities: { type: "array" },
                aspect_ratio: { type: "string" },
                resolution: { type: "string" },
                ar: { type: "string" },
            },
        },
    };

export function getLaoZhangModelMapping(
    model: MediaModel,
): LaoZhangModelMapping | undefined {
    return LAOZHANG_MODEL_MAPPING[model];
}

