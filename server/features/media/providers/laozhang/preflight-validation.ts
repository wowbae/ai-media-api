// Preflight validation for LaoZhang request bodies
import type { MediaModel } from "../../interfaces";
import {
    getLaoZhangModelMapping,
    LAOZHANG_SCHEMA_BY_FAMILY,
    type PayloadSchema,
} from "./payload-mapping";

export interface LaoZhangPreflightError {
    field: string;
    message: string;
}

export interface LaoZhangPreflightResult {
    success: boolean;
    errors: LaoZhangPreflightError[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validateSchema(schema: PayloadSchema, payload: Record<string, unknown>) {
    const errors: LaoZhangPreflightError[] = [];
    const allowed = new Set([...schema.required, ...schema.optional]);

    for (const required of schema.required) {
        if (payload[required] === undefined || payload[required] === null) {
            errors.push({ field: required, message: "Поле обязательно" });
        }
    }

    for (const key of Object.keys(payload)) {
        if (!allowed.has(key)) {
            errors.push({ field: key, message: "Лишнее поле (unknown key)" });
        }
    }

    return errors;
}

export function validateLaoZhangPayload(
    modelKey: MediaModel,
    payloadFamily: string,
    payload: unknown,
): LaoZhangPreflightResult {
    const mapping = getLaoZhangModelMapping(modelKey);
    const schema = mapping ? LAOZHANG_SCHEMA_BY_FAMILY[mapping.payloadFamily] : undefined;
    if (!schema) {
        return {
            success: false,
            errors: [
                {
                    field: "model",
                    message: `Нет schema для модели ${modelKey} (${payloadFamily})`,
                },
            ],
        };
    }

    if (!isRecord(payload)) {
        return {
            success: false,
            errors: [{ field: "payload", message: "Payload должен быть объектом" }],
        };
    }

    const errors = validateSchema(schema, payload);
    return { success: errors.length === 0, errors };
}

