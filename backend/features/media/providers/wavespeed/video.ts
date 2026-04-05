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
import {
    getWavespeedModelMapping,
    resolveWavespeedEndpoint,
    resolvePayloadFamily,
} from "./payload-mapping";
import {
    buildWavespeedPayload,
    type Wan2_2I2vPayload,
    type Wan2_2I2vLoraPayload,
    type KlingVideoO1Payload,
} from "./payload-builders";
import {
    validatePayload,
    createPreflightError,
    logPreflightResult,
    getInputCardinalityGuard,
} from "./preflight-validation";

async function uploadReferenceImages(
    uploader: Client,
    inputFiles: string[],
    maxCount: number,
): Promise<string[]> {
    const referenceImages = inputFiles.slice(0, maxCount);
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
            // Получаем mapping для модели
            const mapping = getWavespeedModelMapping(params.model);
            if (!mapping) {
                throw new Error(
                    `Неизвестная модель Wavespeed: ${params.model}`,
                );
            }

            const { externalEndpoint, payloadFamily, inputCardinality } =
                mapping;

            // Input cardinality guard
            if (inputCardinality.type === "image" && params.inputFiles) {
                if (params.inputFiles.length < inputCardinality.min) {
                    throw new Error(
                        `Модель требует минимум ${inputCardinality.min} изображение(ий)`,
                    );
                }
                if (params.inputFiles.length > inputCardinality.max) {
                    throw new Error(
                        `Модель поддерживает максимум ${inputCardinality.max} изображение(ий)`,
                    );
                }
            }

            // Загружаем reference images через uploader
            const imageUrls = await uploadReferenceImages(
                uploader,
                params.inputFiles || [],
                inputCardinality.max,
            );
            if (!imageUrls.length && inputCardinality.min > 0) {
                throw new Error(
                    "Не удалось подготовить reference images для Wavespeed",
                );
            }

            // Строим payload через typed builder
            const payload = buildWavespeedPayload(params.model, {
                ...params,
                inputFiles: imageUrls,
            });

            // Preflight validation
            const validation = validatePayload(params.model, payload);
            logPreflightResult(
                params.model,
                externalEndpoint,
                payloadFamily,
                validation,
            );

            if (!validation.success) {
                const error = createPreflightError(
                    params.model,
                    validation.errors,
                );
                throw new Error(`Payload validation failed: ${error.message}`);
            }

            // Отправляем запрос
            const response = await fetch(`${baseURL}/${externalEndpoint}`, {
                method: "POST",
                headers: createWavespeedHeaders(apiKey),
                body: JSON.stringify(payload),
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
