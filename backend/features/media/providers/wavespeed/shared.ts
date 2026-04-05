import type { SavedFileInfo } from "../../file.service";
import { saveFileFromUrl } from "../../file.service";
import {
    WAVESPEED_STATUS_MAP,
    type WavespeedErrorResponse,
    type WavespeedResultResponse,
    type WavespeedSubmitResponse,
} from "./interfaces";

export const WAVESPEED_API_BASE = "https://api.wavespeed.ai/api/v3";

export function resolveWavespeedBaseUrl(baseURL?: string): string {
    return (baseURL || WAVESPEED_API_BASE).replace(/\/$/, "");
}

export function createWavespeedHeaders(apiKey: string): Record<string, string> {
    return {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
    };
}

export async function parseWavespeedError(response: Response): Promise<string> {
    const rawText = await response.text();

    try {
        const parsed = JSON.parse(rawText) as WavespeedErrorResponse;
        return parsed.message || parsed.error || rawText;
    } catch {
        return rawText || response.statusText;
    }
}

export function ensureTaskId(data: WavespeedSubmitResponse): string {
    if (!data.data?.id) {
        throw new Error(
            `Wavespeed API не вернул task id: ${JSON.stringify(data)}`,
        );
    }

    return data.data.id;
}

/** Submit: обёртка `{ code, data: { id, urls } }` или плоский `{ id, status }` (Flux-2-max и др.). */
export function parseWavespeedSubmitResponse(raw: unknown): {
    taskId: string;
    pollUrl?: string;
    rawStatus?: string;
} {
    if (!raw || typeof raw !== "object") {
        throw new Error(`Wavespeed submit: неверный JSON`);
    }
    const r = raw as Record<string, unknown>;
    let taskId: string | undefined;
    let pollUrl: string | undefined;
    let rawStatus: string | undefined;

    const data = r.data;
    if (data && typeof data === "object" && data !== null) {
        const d = data as Record<string, unknown>;
        if (typeof d.id === "string") taskId = d.id;
        if (typeof d.status === "string") rawStatus = d.status;
        const urls = d.urls as { get?: unknown } | undefined;
        if (urls && typeof urls.get === "string") pollUrl = urls.get;
    }
    if (!taskId && typeof r.id === "string") taskId = r.id;
    if (!rawStatus && typeof r.status === "string") rawStatus = r.status;

    if (!taskId) {
        throw new Error(
            `Wavespeed API не вернул task id: ${JSON.stringify(raw)}`,
        );
    }
    return { taskId, pollUrl, rawStatus };
}

export function mapWavespeedStatus(
    status?: string,
): "pending" | "processing" | "done" | "failed" {
    if (!status) return "pending";
    const key = status.toLowerCase();
    return (
        WAVESPEED_STATUS_MAP[key as keyof typeof WAVESPEED_STATUS_MAP] ||
        "processing"
    );
}

/** Терминальный успех в теле GET (completed / success / done — у разных моделей по-разному). */
export function isWavespeedRawStatusTerminalSuccess(
    raw: string | undefined,
): boolean {
    if (!raw) return false;
    const s = raw.toLowerCase();
    return s === "completed" || s === "success" || s === "done";
}

export function assertTaskIdFormat(taskId: string): void {
    if (taskId.startsWith("wavespeed-") && taskId.includes("-")) {
        throw new Error(
            `Некорректный формат taskId: ${taskId}. Используйте taskId, который вернул Wavespeed API.`,
        );
    }
}

export async function fetchPredictionResult(
    baseURL: string,
    apiKey: string,
    taskId: string,
): Promise<WavespeedResultResponse> {
    const response = await fetch(`${baseURL}/predictions/${taskId}`, {
        method: "GET",
        headers: createWavespeedHeaders(apiKey),
    });

    if (!response.ok) {
        const details = await parseWavespeedError(response);
        if (response.status === 404) {
            throw new Error(
                `Задача с ID "${taskId}" не найдена в Wavespeed API`,
            );
        }
        throw new Error(
            `Wavespeed API вернул ошибку ${response.status}: ${details}`,
        );
    }

    return (await response.json()) as WavespeedResultResponse;
}

/**
 * Некоторые модели отдают outputs только с GET .../predictions/{id}/result.
 */
export async function loadWavespeedPredictionWithOptionalResult(
    baseURL: string,
    apiKey: string,
    taskId: string,
    pollUrl?: string,
): Promise<WavespeedResultResponse> {
    const primary = pollUrl
        ? await fetchPredictionResultByUrl(apiKey, pollUrl)
        : await fetchPredictionResult(baseURL, apiKey, taskId);

    if (!primary.data) {
        return primary;
    }

    const status = primary.data.status;
    const outputs = primary.data.outputs;
    if (
        isWavespeedRawStatusTerminalSuccess(status) &&
        (!outputs || outputs.length === 0)
    ) {
        const res = await fetch(`${baseURL}/predictions/${taskId}/result`, {
            method: "GET",
            headers: createWavespeedHeaders(apiKey),
        });
        if (!res.ok) return primary;

        const secondaryRaw = await res.json();
        let secOutputs: unknown;
        if (
            secondaryRaw &&
            typeof secondaryRaw === "object" &&
            "data" in secondaryRaw &&
            (secondaryRaw as WavespeedResultResponse).data &&
            typeof (secondaryRaw as WavespeedResultResponse).data === "object"
        ) {
            secOutputs = (secondaryRaw as WavespeedResultResponse).data!
                .outputs;
        } else if (secondaryRaw && typeof secondaryRaw === "object") {
            secOutputs = (secondaryRaw as Record<string, unknown>).outputs;
        }

        const outArr = Array.isArray(secOutputs)
            ? secOutputs.filter((x): x is string => typeof x === "string")
            : [];

        if (outArr.length > 0) {
            return {
                ...primary,
                data: {
                    ...primary.data,
                    outputs: outArr,
                    status:
                        (sec as { status?: string }).status ??
                        primary.data.status,
                },
            };
        }
    }

    return primary;
}

export async function fetchPredictionResultByUrl(
    apiKey: string,
    resultUrl: string,
): Promise<WavespeedResultResponse> {
    const response = await fetch(resultUrl, {
        method: "GET",
        headers: createWavespeedHeaders(apiKey),
    });

    if (!response.ok) {
        const details = await parseWavespeedError(response);
        throw new Error(
            `Wavespeed result URL вернул ошибку ${response.status}: ${details}`,
        );
    }

    return (await response.json()) as WavespeedResultResponse;
}

export async function downloadOutputs(
    outputs: string[],
): Promise<SavedFileInfo[]> {
    const files: SavedFileInfo[] = [];

    for (const outputUrl of outputs) {
        if (!outputUrl || typeof outputUrl !== "string") continue;
        files.push(await saveFileFromUrl(outputUrl));
    }

    return files;
}
