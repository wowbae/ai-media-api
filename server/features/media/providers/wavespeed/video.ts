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
} from "./shared";

const KLING_VIDEO_MODEL_ID = "kwaivgi/kling-video-o1-std/reference-to-video";

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
}) {
    const { apiKey, baseURL, taskResultsCache } = options;
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
                images: imageUrls,
                duration: mapDuration(params.duration),
            };

            const response = await fetch(`${baseURL}/${KLING_VIDEO_MODEL_ID}`, {
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

            const resultData = await fetchPredictionResult(
                baseURL,
                apiKey,
                taskId,
            );
            if (!resultData.data)
                throw new Error("Wavespeed API не вернул data в ответе");

            if (resultData.data.status === "failed") {
                throw new Error(
                    `Wavespeed задача провалилась: ${resultData.data.error || "Unknown error"}`,
                );
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

            const resultData = await fetchPredictionResult(
                baseURL,
                apiKey,
                taskId,
            );
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
