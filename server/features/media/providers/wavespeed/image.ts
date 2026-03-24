import type {
    GenerateParams,
    TaskCreatedResult,
    TaskStatusResult,
} from "../interfaces";
import type { SavedFileInfo } from "../../file.service";
import type {
    WavespeedImageTaskRequest,
    WavespeedSubmitResponse,
} from "./interfaces";
import {
    assertTaskIdFormat,
    createWavespeedHeaders,
    downloadOutputs,
    ensureTaskId,
    fetchPredictionResult,
    mapWavespeedStatus,
    parseWavespeedError,
    fetchPredictionResultByUrl,
} from "./shared";
import { getMediaPublicBaseUrl } from "../../config";

const Z_IMAGE_TURBO_LORA_MODEL_ID = "wavespeed-ai/z-image/turbo-lora";
const Z_IMAGE_TURBO_IMAGE_TO_IMAGE_MODEL_ID =
    "wavespeed-ai/z-image-turbo/image-to-image-lora";
const QWEN_IMAGE_2_0_PRO_EDIT_MODEL_ID = "wavespeed-ai/qwen-image-2.0-pro/edit";

const ASPECT_RATIO_TO_SIZE: Record<string, string> = {
    "1:1": "1024*1024",
    "16:9": "1280*720",
    "9:16": "720*1280",
    "4:3": "1024*768",
    "3:4": "768*1024",
    "3:2": "1152*768",
    "2:3": "768*1152",
};

function parseSeed(seed?: string | number): number | undefined {
    if (seed === undefined || seed === null || String(seed).trim() === "") {
        return undefined;
    }

    const parsed = typeof seed === "number" ? seed : Number.parseInt(seed, 10);
    if (Number.isNaN(parsed)) return undefined;
    return parsed;
}

function buildTurboLoraRequest(
    params: GenerateParams,
): WavespeedImageTaskRequest {
    const publicBaseUrl = getMediaPublicBaseUrl();
    const mappedSize = params.aspectRatio
        ? ASPECT_RATIO_TO_SIZE[params.aspectRatio]
        : undefined;

    return {
        prompt: params.prompt,
        size: mappedSize || ASPECT_RATIO_TO_SIZE["1:1"],
        seed: parseSeed(params.seed),
        loras: params.loras?.slice(0, 3).map((lora) => ({
            path: lora.path.startsWith("/media-files/")
                ? `${publicBaseUrl}${lora.path}`
                : lora.path,
            scale: lora.scale,
        })),
    };
}

function buildImageToImageRequest(
    params: GenerateParams,
): WavespeedImageTaskRequest {
    const mappedSize = params.aspectRatio
        ? ASPECT_RATIO_TO_SIZE[params.aspectRatio]
        : undefined;
    const firstInput = params.inputFiles?.[0];
    if (!firstInput) {
        throw new Error(
            "Для Wavespeed Z-Image Turbo Image-to-Image нужно входное изображение",
        );
    }

    return {
        prompt: params.prompt,
        image: firstInput,
        size: mappedSize || ASPECT_RATIO_TO_SIZE["1:1"],
        seed: parseSeed(params.seed),
    };
}

export function createWavespeedImageHandlers(options: {
    apiKey: string;
    baseURL: string;
    taskResultsCache: Map<string, SavedFileInfo[]>;
    taskResultUrlById: Map<string, string>;
}) {
    const { apiKey, baseURL, taskResultsCache, taskResultUrlById } = options;

    return {
        async generateImage(
            params: GenerateParams,
        ): Promise<TaskCreatedResult> {
            const isImageToImageModel =
                params.model === "Z_IMAGE_TURBO_IMAGE_TO_IMAGE_WAVESPEED" ||
                params.model === "QWEN_IMAGE_2_0_PRO_EDIT_WAVESPEED";
            const requestBody = isImageToImageModel
                ? buildImageToImageRequest(params)
                : buildTurboLoraRequest(params);
            const endpoint =
                params.model === "QWEN_IMAGE_2_0_PRO_EDIT_WAVESPEED"
                    ? QWEN_IMAGE_2_0_PRO_EDIT_MODEL_ID
                    : isImageToImageModel
                      ? Z_IMAGE_TURBO_IMAGE_TO_IMAGE_MODEL_ID
                      : Z_IMAGE_TURBO_LORA_MODEL_ID;

            if (!requestBody.prompt?.trim()) {
                throw new Error("Для Wavespeed Z-Image требуется prompt");
            }

            const response = await fetch(`${baseURL}/${endpoint}`, {
                method: "POST",
                headers: createWavespeedHeaders(apiKey),
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const details = await parseWavespeedError(response);
                if (response.status === 401) {
                    throw new Error(
                        "Ошибка авторизации Wavespeed API. Проверьте ключ.",
                    );
                }
                if (response.status === 402 || response.status === 403) {
                    throw new Error(
                        "Недостаточно средств на балансе Wavespeed",
                    );
                }
                throw new Error(
                    `Wavespeed API вернул ошибку ${response.status}: ${details}`,
                );
            }

            const submit = (await response.json()) as WavespeedSubmitResponse;
            const taskId = ensureTaskId(submit);
            if (submit.data?.urls?.get) {
                taskResultUrlById.set(taskId, submit.data.urls.get);
            }

            return {
                taskId,
                status:
                    mapWavespeedStatus(submit.data?.status) === "processing"
                        ? "processing"
                        : "pending",
            };
        },

        async checkImageTaskStatus(taskId: string): Promise<TaskStatusResult> {
            assertTaskIdFormat(taskId);

            const resultUrl = taskResultUrlById.get(taskId);
            const resultData = resultUrl
                ? await fetchPredictionResultByUrl(apiKey, resultUrl)
                : await fetchPredictionResult(baseURL, apiKey, taskId);
            if (!resultData.data)
                throw new Error("Wavespeed API не вернул data в ответе");

            if (resultData.data.status === "failed") {
                return {
                    status: "failed",
                    error: resultData.data.error || "Unknown error",
                };
            }

            if (
                resultData.data.status === "completed" &&
                resultData.data.outputs?.length
            ) {
                taskResultsCache.set(
                    taskId,
                    await downloadOutputs(resultData.data.outputs),
                );
            }

            return { status: mapWavespeedStatus(resultData.data.status) };
        },

        async getImageTaskResult(taskId: string): Promise<SavedFileInfo[]> {
            assertTaskIdFormat(taskId);

            const cached = taskResultsCache.get(taskId);
            if (cached) {
                taskResultsCache.delete(taskId);
                return cached;
            }

            const resultUrl = taskResultUrlById.get(taskId);
            const resultData = resultUrl
                ? await fetchPredictionResultByUrl(apiKey, resultUrl)
                : await fetchPredictionResult(baseURL, apiKey, taskId);
            if (!resultData.data)
                throw new Error("Wavespeed API не вернул data в ответе");
            if (resultData.data.status !== "completed") {
                throw new Error(
                    `Задача еще не завершена. Текущий статус: ${resultData.data.status}`,
                );
            }
            if (!resultData.data.outputs?.length) {
                throw new Error(
                    "Wavespeed вернул пустой результат (нет выходных файлов)",
                );
            }

            const files = await downloadOutputs(resultData.data.outputs);
            if (!files.length) throw new Error("Не удалось скачать результаты");
            return files;
        },
    };
}
