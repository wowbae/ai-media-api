import type {
    GenerateParams,
    TaskCreatedResult,
    TaskStatusCheckContext,
    TaskStatusResult,
} from "../interfaces";
import type { SavedFileInfo } from "../../file.service";
import type { Client } from "wavespeed";
import { createWavespeedSdkClient } from "./wavespeed-sdk-client";
import { writeFile, unlink, mkdtemp } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import type { WavespeedImageTaskRequest } from "./interfaces";
import {
    assertTaskIdFormat,
    createWavespeedHeaders,
    downloadOutputs,
    loadWavespeedPredictionWithOptionalResult,
    mapWavespeedStatus,
    parseWavespeedError,
    parseWavespeedSubmitResponse,
    isWavespeedRawStatusTerminalSuccess,
} from "./shared";
import {
    getWavespeedModelMapping,
    resolveWavespeedEndpoint,
    resolvePayloadFamily,
} from "./payload-mapping";
import {
    buildWavespeedPayload,
    type ZImageTurboLoraPayload,
    type ZImageI2iLoraPayload,
    type ZImageLoraTrainerPayload,
    type QwenImageEditPayload,
    type SeedreamV4_5EditPayload,
} from "./payload-builders";
import {
    validatePayload,
    createPreflightError,
    logPreflightResult,
    getInputCardinalityGuard,
    validateLoraInputs,
} from "./preflight-validation";
import { getMediaPublicBaseUrl } from "../../config";

const MAX_TRAINER_ZIP_SIZE_BYTES = 50 * 1024 * 1024;

function parseZipBase64(input: string): Buffer {
    const matches = input.match(/^data:application\/zip;base64,(.+)$/);
    if (!matches?.[1]) {
        throw new Error(
            "Для Z-Image LoRA Trainer передайте ZIP-архив в формате data:application/zip;base64,...",
        );
    }
    const buffer = Buffer.from(matches[1], "base64");
    if (buffer.byteLength > MAX_TRAINER_ZIP_SIZE_BYTES) {
        throw new Error(
            "ZIP-архив для LoRA Trainer слишком большой. Максимум 50MB",
        );
    }
    return buffer;
}

async function uploadTrainerArchive(
    uploader: Client,
    archiveBase64OrUrl: string,
): Promise<string> {
    if (
        archiveBase64OrUrl.startsWith("http://") ||
        archiveBase64OrUrl.startsWith("https://")
    ) {
        return archiveBase64OrUrl;
    }

    const zipBuffer = parseZipBase64(archiveBase64OrUrl);
    const tempDir = await mkdtemp(join(tmpdir(), "wavespeed-lora-trainer-"));
    const tempFilePath = join(tempDir, "dataset.zip");
    try {
        await writeFile(tempFilePath, zipBuffer);
        return await uploader.upload(tempFilePath);
    } finally {
        await unlink(tempFilePath).catch(() => {});
    }
}

export function createWavespeedImageHandlers(options: {
    apiKey: string;
    baseURL: string;
    taskResultsCache: Map<string, SavedFileInfo[]>;
    taskResultUrlById: Map<string, string>;
}) {
    const { apiKey, baseURL, taskResultsCache, taskResultUrlById } = options;
    const uploader = createWavespeedSdkClient(apiKey);

    return {
        async generateImage(
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

            // Для LoRA Trainer загружаем архив
            let uploadedArchiveUrl: string | undefined;
            if (inputCardinality.type === "zip") {
                const archiveInput = params.inputFiles?.[0];
                if (!archiveInput) {
                    throw new Error(
                        "Для Z-Image LoRA Trainer требуется ZIP-архив датасета в inputFiles[0]",
                    );
                }
                uploadedArchiveUrl = await uploadTrainerArchive(
                    uploader,
                    archiveInput,
                );
            }

            // Строим payload через typed builder
            const payload = buildWavespeedPayload(
                params.model,
                params,
                uploadedArchiveUrl,
            );

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

            // Валидация LoRA URL (preflight для remote assets)
            if ("loras" in payload && Array.isArray(payload.loras)) {
                await validateLoraInputs(payload.loras);
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

            const rawSubmit = await response.json();
            const {
                taskId,
                pollUrl: pollGetUrl,
                rawStatus,
            } = parseWavespeedSubmitResponse(rawSubmit);
            if (pollGetUrl) {
                taskResultUrlById.set(taskId, pollGetUrl);
            }

            return {
                taskId,
                wavespeedPollUrl: pollGetUrl,
                status:
                    mapWavespeedStatus(rawStatus) === "processing"
                        ? "processing"
                        : "pending",
            };
        },

        async checkImageTaskStatus(
            taskId: string,
            context?: TaskStatusCheckContext,
        ): Promise<TaskStatusResult> {
            assertTaskIdFormat(taskId);

            const pollUrl =
                taskResultUrlById.get(taskId) ?? context?.wavespeedPollUrl;
            const resultData = await loadWavespeedPredictionWithOptionalResult(
                baseURL,
                apiKey,
                taskId,
                pollUrl,
            );
            if (!resultData.data)
                throw new Error("Wavespeed API не вернул data в ответе");

            const rawStatus = resultData.data.status;
            if (rawStatus && mapWavespeedStatus(rawStatus) === "failed") {
                return {
                    status: "failed",
                    error: resultData.data.error || "Unknown error",
                };
            }

            if (
                isWavespeedRawStatusTerminalSuccess(rawStatus) &&
                resultData.data.outputs?.length
            ) {
                return {
                    status: mapWavespeedStatus(rawStatus),
                    resultUrls: resultData.data.outputs,
                };
            }

            return { status: mapWavespeedStatus(rawStatus) };
        },

        async getImageTaskResult(
            taskId: string,
            context?: TaskStatusCheckContext,
        ): Promise<SavedFileInfo[]> {
            assertTaskIdFormat(taskId);

            const cached = taskResultsCache.get(taskId);
            if (cached) {
                taskResultsCache.delete(taskId);
                return cached;
            }

            const pollUrl =
                taskResultUrlById.get(taskId) ?? context?.wavespeedPollUrl;
            const resultData = await loadWavespeedPredictionWithOptionalResult(
                baseURL,
                apiKey,
                taskId,
                pollUrl,
            );
            if (!resultData.data)
                throw new Error("Wavespeed API не вернул data в ответе");
            if (!isWavespeedRawStatusTerminalSuccess(resultData.data.status)) {
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
