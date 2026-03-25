import { Client } from "wavespeed";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import type {
    GenerateParams,
    TaskCreatedResult,
    TaskStatusResult,
} from "../interfaces";
import type { SavedFileInfo } from "../../file.service";
import type { WavespeedSubmitResponse } from "./interfaces";
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

const KLING_VIDEO_MODEL_ID = "kwaivgi/kling-video-o1-std/reference-to-video";
const WAN_2_2_IMAGE_TO_VIDEO_LORA_MODEL_ID =
    "wavespeed-ai/wan-2.2/image-to-video-lora";
const WAN_2_2_IMAGE_TO_VIDEO_MODEL_ID = "wavespeed-ai/wan-2.2/i2v-720p";

function resolveVideoModelEndpoint(model: GenerateParams["model"]): string {
    if (model === "WAN_2_2_IMAGE_TO_VIDEO_LORA_WAVESPEED")
        return WAN_2_2_IMAGE_TO_VIDEO_LORA_MODEL_ID;
    if (model === "WAN_2_2_IMAGE_TO_VIDEO_WAVESPEED")
        return WAN_2_2_IMAGE_TO_VIDEO_MODEL_ID;
    return KLING_VIDEO_MODEL_ID;
}

function mapDuration(duration?: number): number {
    const numericDuration =
        typeof duration === "string" ? Number.parseInt(duration, 10) : duration;

    if (
        typeof numericDuration === "number" &&
        !Number.isNaN(numericDuration) &&
        numericDuration >= 3 &&
        numericDuration <= 10
    ) {
        return numericDuration;
    }

    return 5;
}

function mapDurationByModel(
    model: GenerateParams["model"],
    duration?: number,
): number {
    if (
        model === "WAN_2_2_IMAGE_TO_VIDEO_LORA_WAVESPEED" ||
        model === "WAN_2_2_IMAGE_TO_VIDEO_WAVESPEED"
    ) {
        return duration === 8 ? 8 : 5;
    }

    return mapDuration(duration);
}

async function uploadReferenceImages(
    uploader: Client,
    inputFiles: string[],
): Promise<string[]> {
    const referenceImages = inputFiles.slice(0, 10);
    const tempFiles: string[] = [];
    const uploadedUrls: string[] = [];

    try {
        for (let i = 0; i < referenceImages.length; i += 1) {
            const image = referenceImages[i];

            if (!image.startsWith("data:") && !image.startsWith("http"))
                continue;

            let buffer: Buffer;
            let extension = "jpg";

            if (image.startsWith("data:")) {
                const [header, base64Data] = image.split(",");
                const mimeType =
                    header.match(/data:([^;]+)/)?.[1] || "image/png";
                extension = mimeType.split("/")[1] || "png";
                buffer = Buffer.from(base64Data, "base64");
            } else {
                const response = await fetch(image);
                if (!response.ok) {
                    throw new Error(
                        `Не удалось скачать reference image: ${response.status}`,
                    );
                }
                buffer = Buffer.from(await response.arrayBuffer());
            }

            const tempFilePath = join(
                tmpdir(),
                `wavespeed-${Date.now()}-${i}.${extension}`,
            );
            await writeFile(tempFilePath, buffer);
            tempFiles.push(tempFilePath);

            uploadedUrls.push(await uploader.upload(tempFilePath));
        }
    } finally {
        await Promise.all(
            tempFiles.map(async (tempPath) => {
                try {
                    await unlink(tempPath);
                } catch {
                    // ignore cleanup failures
                }
            }),
        );
    }

    return uploadedUrls;
}

export function createWavespeedVideoHandlers(options: {
    apiKey: string;
    baseURL: string;
    taskResultsCache: Map<string, SavedFileInfo[]>;
    taskResultUrlById: Map<string, string>;
}) {
    const { apiKey, baseURL, taskResultsCache, taskResultUrlById } = options;
    const uploader = new Client(apiKey);

    return {
        async generateVideo(
            params: GenerateParams,
        ): Promise<TaskCreatedResult> {
            if (!params.inputFiles?.length) {
                throw new Error(
                    "Wavespeed Kling Video O1 требует reference images",
                );
            }

            const imageUrls = await uploadReferenceImages(
                uploader,
                params.inputFiles,
            );
            if (!imageUrls.length) {
                throw new Error(
                    "Не удалось подготовить reference images для Wavespeed",
                );
            }

            const requestBody = {
                prompt: params.prompt,
                image: imageUrls[0],
                images: imageUrls,
                duration: mapDurationByModel(params.model, params.duration),
                safety_checker: false,
            };
            const endpoint = resolveVideoModelEndpoint(params.model);

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

        async checkVideoTaskStatus(taskId: string): Promise<TaskStatusResult> {
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

        async getVideoTaskResult(taskId: string): Promise<SavedFileInfo[]> {
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
