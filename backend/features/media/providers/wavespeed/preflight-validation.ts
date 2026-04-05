// Preflight Validation для Wavespeed payload
// Валидация payload перед отправкой во внешний API

import type { MediaModel } from "../../config";
import type { WavespeedPayload } from "./payload-builders";
import {
    type PayloadSchema,
    type WavespeedPayloadFamily,
    getWavespeedModelMapping,
    getPayloadSchema,
    WAVESPEED_MODEL_MAPPING,
} from "./payload-mapping";

// Типы ошибок валидации
export interface ValidationError {
    field: string;
    message: string;
    code: "REQUIRED" | "TYPE" | "RANGE" | "ENUM" | "CARDINALITY" | "UNKNOWN";
}

export interface PreflightValidationResult {
    success: boolean;
    errors: ValidationError[];
    warnings: string[];
}

// Проверка типа значения
function checkType(value: unknown, expectedType: string): boolean {
    if (value === undefined || value === null) {
        return true; // optional fields are checked separately
    }

    switch (expectedType) {
        case "string":
            return typeof value === "string";
        case "number":
            return typeof value === "number" && !Number.isNaN(value);
        case "integer":
            return typeof value === "number" && Number.isInteger(value);
        case "boolean":
            return typeof value === "boolean";
        case "array":
            return Array.isArray(value);
        case "object":
            return typeof value === "object" && value !== null;
        default:
            return true;
    }
}

// Валидация одного поля
function validateField(
    field: string,
    value: unknown,
    schema: PayloadSchema,
    payload: WavespeedPayload,
): ValidationError[] {
    const errors: ValidationError[] = [];
    const validation = schema.validations?.[field];

    // Проверка типа
    if (validation?.type && !checkType(value, validation.type)) {
        errors.push({
            field,
            message: `Поле "${field}" должно быть типа ${validation.type}`,
            code: "TYPE",
        });
        return errors; // дальнейшие проверки не имеют смысла
    }

    // Проверка диапазона для number/integer
    if (typeof value === "number") {
        if (validation?.min !== undefined && value < validation.min) {
            errors.push({
                field,
                message: `Поле "${field}" должно быть >= ${validation.min}`,
                code: "RANGE",
            });
        }
        if (validation?.max !== undefined && value > validation.max) {
            errors.push({
                field,
                message: `Поле "${field}" должно быть <= ${validation.max}`,
                code: "RANGE",
            });
        }
    }

    // Проверка enum
    if (validation?.enum && typeof value === "string") {
        if (!validation.enum.includes(value)) {
            errors.push({
                field,
                message: `Поле "${field}" должно быть одним из: ${validation.enum.join(", ")}`,
                code: "ENUM",
            });
        }
    }

    // Проверка array cardinality
    if (Array.isArray(value)) {
        if (
            validation?.minItems !== undefined &&
            value.length < validation.minItems
        ) {
            errors.push({
                field,
                message: `Массив "${field}" должен содержать минимум ${validation.minItems} элементов`,
                code: "CARDINALITY",
            });
        }
        if (
            validation?.maxItems !== undefined &&
            value.length > validation.maxItems
        ) {
            errors.push({
                field,
                message: `Массив "${field}" должен содержать максимум ${validation.maxItems} элементов`,
                code: "CARDINALITY",
            });
        }
    }

    return errors;
}

// Основная функция preflight валидации
export function validatePayload(
    model: MediaModel,
    payload: WavespeedPayload,
): PreflightValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Получаем mapping и схему
    const mapping = getWavespeedModelMapping(model);
    if (!mapping) {
        errors.push({
            field: "model",
            message: `Неизвестная модель: ${model}`,
            code: "REQUIRED",
        });
        return { success: false, errors, warnings };
    }

    const schema = getPayloadSchema(mapping.payloadFamily);

    // Проверка required полей
    for (const requiredField of schema.required) {
        const value = (payload as unknown as Record<string, unknown>)[
            requiredField
        ];
        if (
            value === undefined ||
            value === null ||
            (typeof value === "string" && value.trim() === "")
        ) {
            errors.push({
                field: requiredField,
                message: `Обязательное поле "${requiredField}" отсутствует`,
                code: "REQUIRED",
            });
        }
    }

    // Проверка типов и валидаций для всех полей
    for (const [field, value] of Object.entries(payload)) {
        // Проверка unknown fields (поля не из white-list)
        const allowedFields = [...schema.required, ...schema.optional];
        if (!allowedFields.includes(field)) {
            warnings.push(`Unknown field "${field}" будет проигнорирован`);
            continue;
        }

        const fieldErrors = validateField(field, value, schema, payload);
        errors.push(...fieldErrors);
    }

    // Проверка input cardinality
    const { inputCardinality } = mapping;
    if (inputCardinality.type !== "none") {
        // cardinality проверяется на уровне builder, но можно добавить warning
        if (
            inputCardinality.type === "image" ||
            inputCardinality.type === "zip"
        ) {
            // уже проверено в builder
        }
    }

    return {
        success: errors.length === 0,
        errors,
        warnings,
    };
}

// Unified error формат для error mapping
export interface UnifiedProviderError {
    providerName: string;
    modelKey: MediaModel;
    externalEndpoint: string;
    validationPhase: "preflight" | "submit";
    code: string;
    message: string;
    details?: Record<string, unknown>;
}

// Создание unified error из validation errors
export function createPreflightError(
    model: MediaModel,
    validationErrors: ValidationError[],
): UnifiedProviderError {
    const mapping = getWavespeedModelMapping(model);

    return {
        providerName: "wavespeed",
        modelKey: model,
        externalEndpoint: mapping?.externalEndpoint || "unknown",
        validationPhase: "preflight",
        code: "PAYLOAD_VALIDATION",
        message: `Валидация payload не пройдена: ${validationErrors.map((e) => e.message).join("; ")}`,
        details: {
            errors: validationErrors,
        },
    };
}

// Создание unified error из submit ошибки
export function createSubmitError(
    model: MediaModel,
    statusCode: number,
    responseBody: string,
): UnifiedProviderError {
    const mapping = getWavespeedModelMapping(model);

    return {
        providerName: "wavespeed",
        modelKey: model,
        externalEndpoint: mapping?.externalEndpoint || "unknown",
        validationPhase: "submit",
        code: `HTTP_${statusCode}`,
        message: `Wavespeed API вернул ошибку ${statusCode}: ${responseBody}`,
        details: {
            statusCode,
            responseBody,
        },
    };
}

// Логирование preflight результатов
export function logPreflightResult(
    model: MediaModel,
    endpoint: string,
    payloadFamily: WavespeedPayloadFamily,
    result: PreflightValidationResult,
): void {
    const mapping = getWavespeedModelMapping(model);
    const logData = {
        timestamp: new Date().toISOString(),
        provider: "wavespeed",
        modelKey: model,
        externalEndpoint: endpoint,
        payloadFamily,
        validationSuccess: result.success,
        errors: result.errors,
        warnings: result.warnings,
    };

    if (result.success) {
        console.log(
            "[PayloadMapping] Preflight validation passed:",
            JSON.stringify(logData),
        );
    } else {
        console.error(
            "[PayloadMapping] Preflight validation failed:",
            JSON.stringify(logData),
        );
    }
}

// Helper для получения input cardinality guard
export function getInputCardinalityGuard(
    model: MediaModel,
): { min: number; max: number; type: string } | undefined {
    const mapping = WAVESPEED_MODEL_MAPPING[model];
    if (!mapping) return undefined;

    return {
        min: mapping.inputCardinality.min,
        max: mapping.inputCardinality.max,
        type: mapping.inputCardinality.type,
    };
}

// Validation для remote LoRA URL
export async function validateRemoteLoraUrl(url: string): Promise<void> {
    const methods: Array<"HEAD" | "GET"> = ["HEAD", "GET"];

    for (const method of methods) {
        const response = await fetch(url, { method });
        if (response.ok) return;
        if (response.status !== 405) {
            throw new Error(
                `LoRA URL недоступен (${response.status} ${response.statusText}): ${url}`,
            );
        }
    }

    throw new Error(`LoRA URL не поддерживает HEAD/GET: ${url}`);
}

export async function validateLoraInputs(
    loras?: Array<{ path: string }>,
): Promise<void> {
    if (!loras?.length) return;

    await Promise.all(
        loras.map(async (lora) => {
            if (
                lora.path.startsWith("http://") ||
                lora.path.startsWith("https://")
            ) {
                await validateRemoteLoraUrl(lora.path);
            }
        }),
    );
}
