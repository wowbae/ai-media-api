// Preflight validation for Kie.ai request bodies
import type { MediaModel } from "../../interfaces";
import {
    getKieAiModelMapping,
    getKieAiPayloadSchema,
    type KieAiModelMapping,
    type PayloadSchema,
} from "./payload-mapping";

export interface PayloadValidationError {
    field: string;
    message: string;
}

export interface PayloadValidationResult {
    success: boolean;
    errors: PayloadValidationError[];
    providerName: "kieai";
    modelKey: MediaModel;
    endpoint: string;
    payloadFamily: string;
    validationPhase: "preflight" | "submit";
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validateFieldType(
    field: string,
    value: unknown,
    schema: PayloadSchema,
): PayloadValidationError[] {
    const rules = schema.validations?.[field];
    if (!rules) return [];
    const errors: PayloadValidationError[] = [];

    const type = Array.isArray(value) ? "array" : typeof value;
    const normalizedType =
        type === "object" && value === null ? "null" : (type as string);

    if (rules.type === "array" && !Array.isArray(value)) {
        errors.push({ field, message: "Ожидается массив" });
    } else if (rules.type === "object" && !isRecord(value)) {
        errors.push({ field, message: "Ожидается объект" });
    } else if (
        rules.type !== "array" &&
        rules.type !== "object" &&
        rules.type !== normalizedType
    ) {
        errors.push({ field, message: `Ожидается тип ${rules.type}` });
    }

    if (rules.enum && (value as any) !== undefined) {
        if (!rules.enum.includes(value as any)) {
            errors.push({
                field,
                message: `Недопустимое значение: ${String(value)}`,
            });
        }
    }

    return errors;
}

function validateSchemaKeys(
    schema: PayloadSchema,
    payload: Record<string, unknown>,
): PayloadValidationError[] {
    const errors: PayloadValidationError[] = [];
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

    for (const [key, value] of Object.entries(payload)) {
        errors.push(...validateFieldType(key, value, schema));
    }

    return errors;
}

export function validateKieAiPayload(
    modelKey: MediaModel,
    endpoint: string,
    payloadFamily: string,
    payload: unknown,
): PayloadValidationResult {
    const mapping = getKieAiModelMapping(modelKey);

    if (!mapping) {
        return {
            success: false,
            errors: [
                {
                    field: "model",
                    message: `Нет mapping для модели ${modelKey}`,
                },
            ],
            providerName: "kieai",
            modelKey,
            endpoint,
            payloadFamily,
            validationPhase: "preflight",
        };
    }

    if (!isRecord(payload)) {
        return {
            success: false,
            errors: [{ field: "payload", message: "Payload должен быть объектом" }],
            providerName: "kieai",
            modelKey,
            endpoint,
            payloadFamily,
            validationPhase: "preflight",
        };
    }

    const schema = getKieAiPayloadSchema(mapping);
    const errors = validateSchemaKeys(schema, payload);

    return {
        success: errors.length === 0,
        errors,
        providerName: "kieai",
        modelKey,
        endpoint,
        payloadFamily,
        validationPhase: "preflight",
    };
}

