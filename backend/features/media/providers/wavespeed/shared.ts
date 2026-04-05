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

export function mapWavespeedStatus(
    status?: string,
): "pending" | "processing" | "done" | "failed" {
    if (!status) return "pending";
    return WAVESPEED_STATUS_MAP[status] || "processing";
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
