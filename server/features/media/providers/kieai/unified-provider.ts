// Универсальный Kie.ai провайдер для всех моделей
// Заменяет 14 отдельных провайдеров на один с конфигурацией моделей
import type {
    MediaProvider,
    GenerateParams,
    TaskCreatedResult,
    TaskStatusResult,
} from "../interfaces";
import type { SavedFileInfo } from "../../file.service";
import { saveFileFromUrl } from "../../file.service";
import { uploadToImgbb } from "../../imgbb.service";
import { MEDIA_MODELS } from "../../config";
import type { KieAiConfig } from "./interfaces";
import { prisma } from "prisma/client";
import { kieAiMappers } from "./mappers";

// Маппинг статусов Kie.ai на внутренние статусы
const DEFAULT_STATUS_MAP: Record<string, TaskStatusResult["status"]> = {
    waiting: "pending",
    queuing: "pending",
    generating: "processing",
    success: "done",
    completed: "done",
    done: "done",
    fail: "failed",
    failed: "failed",
};

// Конфигурация модели для универсального провайдера
interface KieAiModelConfig {
    endpoint: string;
    statusEndpoint?: string;
    model: string;
    types: ("IMAGE" | "VIDEO" | "AUDIO")[];
    mapParams: (params: GenerateParams) => Record<string, unknown>;
    statusMap?: Record<string, TaskStatusResult["status"]>;
    extractResultUrls?: (data: any) => string[];
}

export function createUnifiedKieAiProvider(config: KieAiConfig): MediaProvider {
    const { apiKey, baseURL } = config;
    const taskModelMap = new Map<string, string>();

    // Конфигурации всех моделей Kie.ai
    const modelConfigs: Record<string, KieAiModelConfig> = {
        // ========== KLING 2.6 ==========
        KLING_2_6_KIEAI: {
            endpoint: "/api/v1/jobs/createTask",
            model: "kling-2.6",
            types: ["VIDEO"],
            mapParams: (params) => {
                const firstInputFile = params.inputFiles?.[0];
                const isImageToVideo = Boolean(firstInputFile);
                return {
                    model: isImageToVideo
                        ? "kling-2.6/image-to-video"
                        : "kling-2.6/text-to-video",
                    input: {
                        prompt: params.prompt,
                        sound: params.sound ?? true,
                        duration: kieAiMappers.mapKlingDuration(
                            params.duration,
                        ),
                        ...(isImageToVideo && { image_urls: [firstInputFile] }),
                        ...(!isImageToVideo && {
                            aspect_ratio: kieAiMappers.mapKlingAspectRatio(
                                params.aspectRatio,
                            ),
                        }),
                    },
                };
            },
        },

        // ========== KLING 3.0 ==========
        KLING_3_0_KIEAI: {
            endpoint: "/api/v1/jobs/createTask",
            model: "kling-3.0/video",
            types: ["VIDEO"],
            mapParams: (params) => {
                const input: Record<string, unknown> = {
                    mode: params.mode || "std",
                    prompt: params.prompt,
                    sound: params.sound ?? true,
                    duration: String(
                        Math.min(Math.max(params.duration || 5, 3), 15),
                    ),
                    aspect_ratio: kieAiMappers.mapKlingAspectRatio(
                        params.aspectRatio,
                    ),
                };

                if (params.inputFiles && params.inputFiles.length > 0) {
                    input.image_urls = params.inputFiles;
                }

                if (params.multiShots) {
                    input.multi_shots = true;
                }

                return {
                    model: "kling-3.0/video",
                    input,
                };
            },
        },

        // ========== KLING 2.6 MOTION CONTROL ==========
        KLING_2_6_MOTION_CONTROL_KIEAI: {
            endpoint: "/api/v1/jobs/createTask",
            model: "kling-2.6/motion-control",
            types: ["VIDEO"],
            mapParams: (params) => ({
                model: "kling-2.6/motion-control",
                input: {
                    prompt: params.prompt,
                    input_urls: params.inputFiles || [],
                    video_urls: params.inputVideoFiles || [],
                    character_orientation:
                        params.characterOrientation || "image",
                    mode: "1080p",
                },
            }),
        },

        // ========== VEO 3.1 FAST ==========
        VEO_3_1_FAST_KIEAI: {
            endpoint: "/api/v1/veo/generate",
            statusEndpoint: "/api/v1/veo/record-info",
            model: "veo3_fast",
            types: ["VIDEO"],
            mapParams: (params) => {
                const aspectRatio =
                    params.ar ||
                    (params.aspectRatio === "16:9" ||
                    params.aspectRatio === "9:16"
                        ? params.aspectRatio
                        : "16:9");

                return {
                    prompt: params.prompt,
                    model: "veo3_fast",
                    aspectRatio,
                    generationType: params.generationType || "TEXT_2_VIDEO",
                    enableTranslation: true,
                    ...(params.inputFiles &&
                        params.inputFiles.length > 0 && {
                            imageUrls: params.inputFiles,
                        }),
                    ...(params.seed && {
                        seeds:
                            typeof params.seed === "number"
                                ? params.seed
                                : parseInt(params.seed, 10),
                    }),
                };
            },
            extractResultUrls: (data) => {
                if (data.response?.resultUrls) return data.response.resultUrls;
                if (data.resultJson) {
                    try {
                        const parsed = JSON.parse(data.resultJson);
                        return (
                            parsed.resultUrls ||
                            (parsed.videoUrl ? [parsed.videoUrl] : [])
                        );
                    } catch {
                        return [];
                    }
                }
                return [];
            },
        },

        // ========== SEEDANCE 1.5 PRO ==========
        SEEDANCE_1_5_PRO_KIEAI: {
            endpoint: "/api/v1/jobs/createTask",
            model: "seedance-1-5-pro",
            types: ["VIDEO"],
            mapParams: (params) => {
                const input: Record<string, unknown> = {
                    prompt: params.prompt,
                    aspect_ratio:
                        params.aspectRatio === "9:16" ? "9:16" : "16:9",
                    duration: String(
                        params.duration === 12
                            ? "12"
                            : params.duration === 8
                              ? "8"
                              : "4",
                    ),
                    resolution:
                        params.videoQuality === "720p" ? "720p" : "480p",
                    generate_audio: params.sound ?? false,
                    fixed_lens: params.fixedLens ?? false,
                };

                if (params.inputFiles && params.inputFiles.length > 0) {
                    input.input_urls = params.inputFiles.slice(0, 2);
                }

                return {
                    model: "seedance-1-5-pro",
                    input,
                };
            },
        },

        // ========== NANO BANANA PRO ==========
        NANO_BANANA_PRO_KIEAI: {
            endpoint: "/api/v1/jobs/createTask",
            model: "nano-banana-pro",
            types: ["IMAGE"],
            mapParams: (params) => {
                const input: Record<string, unknown> = {
                    prompt: params.prompt,
                    aspect_ratio: params.aspectRatio || "1:1",
                    resolution:
                        params.quality === "4k"
                            ? "4K"
                            : params.quality === "2k"
                              ? "2K"
                              : "1K",
                    output_format: params.outputFormat || "png",
                };

                if (params.inputFiles && params.inputFiles.length > 0) {
                    input.image_input = params.inputFiles;
                }

                return {
                    model: "nano-banana-pro",
                    input,
                };
            },
        },

        // ========== NANO BANANA 2 ==========
        NANO_BANANA_2_KIEAI: {
            endpoint: "/api/v1/jobs/createTask",
            model: "nano-banana-2",
            types: ["IMAGE"],
            mapParams: (params) => {
                const input: Record<string, unknown> = {
                    prompt: params.prompt,
                    aspect_ratio: params.aspectRatio || "1:1",
                    resolution:
                        params.quality === "4k"
                            ? "4K"
                            : params.quality === "2k"
                              ? "2K"
                              : "1K",
                    output_format: params.outputFormat || "png",
                };

                if (params.inputFiles && params.inputFiles.length > 0) {
                    input.image_input = params.inputFiles;
                }

                return {
                    model: "nano-banana-2",
                    input,
                };
            },
        },

        // ========== IMAGEN4 / IMAGEN4 ULTRA ==========
        IMAGEN4_KIEAI: {
            endpoint: "/api/v1/jobs/createTask",
            model: "google/imagen4",
            types: ["IMAGE"],
            mapParams: (params) => ({
                model: "google/imagen4",
                input: {
                    prompt: params.prompt,
                    aspect_ratio: params.aspectRatio || "1:1",
                    ...(params.negativePrompt && {
                        negative_prompt: params.negativePrompt,
                    }),
                    ...(params.seed !== undefined && {
                        seed:
                            typeof params.seed === "number"
                                ? params.seed
                                : parseInt(params.seed, 10),
                    }),
                },
            }),
        },

        IMAGEN4_ULTRA_KIEAI: {
            endpoint: "/api/v1/jobs/createTask",
            model: "google/imagen4-ultra",
            types: ["IMAGE"],
            mapParams: (params) => ({
                model: "google/imagen4-ultra",
                input: {
                    prompt: params.prompt,
                    aspect_ratio: params.aspectRatio || "1:1",
                    ...(params.negativePrompt && {
                        negative_prompt: params.negativePrompt,
                    }),
                    ...(params.seed !== undefined && {
                        seed:
                            typeof params.seed === "number"
                                ? params.seed
                                : parseInt(params.seed, 10),
                    }),
                },
            }),
        },

        // ========== SEEDREAM 4.5 ==========
        SEEDREAM_4_5_KIEAI: {
            endpoint: "/api/v1/jobs/createTask",
            model: "seedream/4.5-text-to-image",
            types: ["IMAGE"],
            mapParams: (params) => ({
                model: "seedream/4.5-text-to-image",
                input: {
                    prompt: params.prompt,
                    aspect_ratio: kieAiMappers.mapSeedreamAspectRatio(
                        params.aspectRatio,
                    ),
                    quality: kieAiMappers.mapSeedreamQuality(params.quality),
                },
            }),
        },

        SEEDREAM_4_5_EDIT_KIEAI: {
            endpoint: "/api/v1/jobs/createTask",
            model: "seedream/4.5-edit",
            types: ["IMAGE"],
            mapParams: (params) => ({
                model: "seedream/4.5-edit",
                input: {
                    prompt: params.prompt,
                    image_urls: params.inputFiles || [],
                    aspect_ratio: kieAiMappers.mapSeedreamAspectRatio(
                        params.aspectRatio,
                    ),
                    quality: kieAiMappers.mapSeedreamQuality(params.quality),
                },
            }),
        },

        // ========== SEEDREAM 5.0 LITE ==========
        SEEDREAM_5_0_LITE_KIEAI: {
            endpoint: "/api/v1/jobs/createTask",
            model: "seedream/5-lite-text-to-image",
            types: ["IMAGE"],
            mapParams: (params) => ({
                model: "seedream/5-lite-text-to-image",
                input: {
                    prompt: params.prompt,
                    aspect_ratio: kieAiMappers.mapSeedreamAspectRatio(
                        params.aspectRatio,
                    ),
                    quality: kieAiMappers.mapSeedreamQuality(params.quality),
                },
            }),
        },

        SEEDREAM_5_0_LITE_EDIT_KIEAI: {
            endpoint: "/api/v1/jobs/createTask",
            model: "seedream/5-lite-image-to-image",
            types: ["IMAGE"],
            mapParams: (params) => ({
                model: "seedream/5-lite-image-to-image",
                input: {
                    prompt: params.prompt,
                    image_urls: params.inputFiles || [],
                    aspect_ratio: kieAiMappers.mapSeedreamAspectRatio(
                        params.aspectRatio,
                    ),
                    quality: kieAiMappers.mapSeedreamQuality(params.quality),
                },
            }),
        },

        // ========== ELEVENLABS MULTILINGUAL V2 ==========
        ELEVENLABS_MULTILINGUAL_V2_KIEAI: {
            endpoint: "/api/v1/jobs/createTask",
            model: "elevenlabs/text-to-speech-multilingual-v2",
            types: ["AUDIO"],
            mapParams: (params) => ({
                model: "elevenlabs/text-to-speech-multilingual-v2",
                input: {
                    text: params.prompt,
                    voice: params.voice || "Rachel",
                    stability: params.stability ?? 0.5,
                    similarity_boost: params.similarityBoost ?? 0.75,
                    speed: params.speed ?? 1,
                    language_code: params.languageCode || "",
                },
            }),
        },

        // ========== MIDJOURNEY ==========
        MIDJOURNEY: {
            endpoint: "/api/v1/mj/generate",
            statusEndpoint: "/api/v1/mj/record-info",
            model: "midjourney",
            types: ["IMAGE"],
            mapParams: (params) => {
                const aspectRatioMap: Record<string, string> = {
                    "1:1": "1:1",
                    "4:3": "4:3",
                    "3:4": "3:4",
                    "9:16": "9:16",
                    "16:9": "16:9",
                    "2:3": "2:3",
                    "3:2": "3:2",
                    "21:9": "16:9",
                };

                return {
                    taskType:
                        params.inputFiles && params.inputFiles.length > 0
                            ? "mj_img2img"
                            : "mj_txt2img",
                    speed: "fast",
                    prompt: params.prompt,
                    aspectRatio: aspectRatioMap[params.aspectRatio || "1:1"],
                    version: "7",
                    ...(params.inputFiles &&
                        params.inputFiles.length > 0 && {
                            fileUrls: params.inputFiles,
                        }),
                };
            },
            extractResultUrls: (data) => {
                if (data.resultInfoJson?.resultUrls) {
                    return data.resultInfoJson.resultUrls.map(
                        (item: any) => item.resultUrl,
                    );
                }
                return [];
            },
        },
    };

    // Загрузка файла на imgbb если это base64
    async function ensurePublicUrl(fileUrl: string): Promise<string> {
        if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
            return fileUrl;
        }
        if (fileUrl.startsWith("data:")) {
            return await uploadToImgbb(fileUrl);
        }
        throw new Error(
            `Неподдерживаемый формат файла: ${fileUrl.substring(0, 50)}`,
        );
    }

    // API вызов с общей обработкой ошибок
    async function apiCall<T>(
        endpoint: string,
        body?: Record<string, unknown>,
    ): Promise<T> {
        const response = await fetch(`${baseURL}${endpoint}`, {
            method: body ? "POST" : "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            ...(body && { body: JSON.stringify(body) }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            let parsed: unknown;
            try {
                parsed = JSON.parse(errorText);
            } catch {
                parsed = errorText;
            }

            if (response.status === 401) {
                throw new Error("Ошибка авторизации Kie.ai API");
            }
            if (response.status === 402 || response.status === 403) {
                throw new Error("Недостаточно средств на балансе Kie.ai");
            }

            throw new Error(
                `Kie.ai API error: ${response.status} - ${errorText}`,
            );
        }

        return response.json();
    }

    // Создание задачи на генерацию
    function getWebhookUrl(): string | undefined {
        const appUrl = process.env.APP_URL?.trim();
        if (!appUrl) return undefined;
        return `${appUrl.replace(/\/$/, "")}/api/media/completion/webhook/kieai`;
    }

    async function createTask(
        params: GenerateParams,
    ): Promise<TaskCreatedResult> {
        const modelConfig = modelConfigs[params.model];
        if (!modelConfig) {
            throw new Error(`Модель ${params.model} не поддерживается`);
        }

        const mediaModelConfig = MEDIA_MODELS[params.model];
        if (!mediaModelConfig || mediaModelConfig.provider !== "kieai") {
            throw new Error(
                `Модель ${params.model} не относится к провайдеру kieai`,
            );
        }

        console.log(
            `[Kie.ai Unified] Генерация: model=${params.model}, prompt=${params.prompt.substring(0, 50)}...`,
        );

        // Подготовка входных файлов (конвертация base64 в URL)
        let processedParams = { ...params };
        if (params.inputFiles && params.inputFiles.length > 0) {
            processedParams.inputFiles = await Promise.all(
                params.inputFiles.map((url) => ensurePublicUrl(url)),
            );
        }

        // Маппинг параметров
        const requestBody = modelConfig.mapParams(processedParams);
        const callbackUrl = getWebhookUrl();
        const requestBodyWithWebhook = callbackUrl
            ? { ...requestBody, callBackUrl: callbackUrl }
            : requestBody;

        // API вызов
        const responseData: any = await apiCall(
            modelConfig.endpoint,
            requestBodyWithWebhook,
        );

        // Извлечение taskId (поддержка разных форматов ответа)
        let taskId: string;
        if (responseData.data?.taskId) {
            taskId = responseData.data.taskId;
        } else if (responseData.data?.id) {
            taskId = responseData.data.id;
        } else {
            throw new Error(
                `Не удалось получить taskId из ответа API: ${JSON.stringify(responseData)}`,
            );
        }

        console.log(`[Kie.ai Unified] Задача создана: taskId=${taskId}`);
        taskModelMap.set(taskId, params.model);

        return {
            taskId,
            status: "pending",
        };
    }

    // Получение статуса задачи
    async function getModelByTaskId(
        taskId: string,
    ): Promise<string | undefined> {
        const cachedModel = taskModelMap.get(taskId);
        if (cachedModel) return cachedModel;

        const request = await prisma.mediaRequest.findFirst({
            where: { taskId },
            select: { model: true },
            orderBy: { createdAt: "desc" },
        });

        if (request?.model) {
            taskModelMap.set(taskId, request.model);
            return request.model;
        }

        return undefined;
    }

    async function getTaskStatus(taskId: string, model: string): Promise<any> {
        const modelConfig = modelConfigs[model];
        const endpoint =
            modelConfig?.statusEndpoint || "/api/v1/jobs/recordInfo";

        const responseData: any = await apiCall(
            `${endpoint}?taskId=${encodeURIComponent(taskId)}`,
        );

        // Поддержка разных форматов ответа
        let data: any;
        if (responseData.data) {
            data = responseData.data;
        } else {
            data = responseData;
        }

        // Для Midjourney - особый формат
        if (model === "MIDJOURNEY") {
            return {
                ...data,
                state:
                    data.successFlag === 1
                        ? "success"
                        : data.successFlag === 0
                          ? "generating"
                          : "waiting",
                resultUrls:
                    data.resultInfoJson?.resultUrls?.map(
                        (item: any) => item.resultUrl,
                    ) || [],
            };
        }

        // Для Veo 3.1 - особый формат
        if (model === "VEO_3_1_FAST_KIEAI") {
            if (
                data.response?.resultUrls &&
                data.response.resultUrls.length > 0
            ) {
                return { ...data, state: "success" };
            }
            if (data.completeTime && !data.response?.resultUrls) {
                return { ...data, state: "fail" };
            }
            return { ...data, state: data.state || "generating" };
        }

        return data;
    }

    // Извлечение URL результатов
    function extractResultUrls(data: any, model: string): string[] {
        const modelConfig = modelConfigs[model];

        // Используем кастомный экстрактор если есть
        if (modelConfig?.extractResultUrls) {
            return modelConfig.extractResultUrls(data);
        }

        // Стандартные пути извлечения
        if (data.resultUrls && Array.isArray(data.resultUrls)) {
            return data.resultUrls;
        }

        if (data.result?.urls && Array.isArray(data.result.urls)) {
            return data.result.urls;
        }

        if (data.result?.url) {
            return [data.result.url];
        }

        if (
            data.response?.resultUrls &&
            Array.isArray(data.response.resultUrls)
        ) {
            return data.response.resultUrls;
        }

        return [];
    }

    return {
        name: "kieai-unified",
        isAsync: true,

        async generate(params: GenerateParams): Promise<TaskCreatedResult> {
            return await createTask(params);
        },

        async checkTaskStatus(taskId: string): Promise<TaskStatusResult> {
            const model = await getModelByTaskId(taskId);
            if (!model) {
                throw new Error(
                    `Не удалось определить модель для taskId=${taskId}`,
                );
            }
            const modelConfig = modelConfigs[model];
            const statusMap = modelConfig?.statusMap || DEFAULT_STATUS_MAP;

            const data = await getTaskStatus(taskId, model);
            const state = data.state || data.status || "waiting";
            const mappedStatus = statusMap[state] || "pending";

            const resultUrls = extractResultUrls(data, model);
            const resultUrl = resultUrls[0];

            const errorMessage =
                data.failMsg || data.error || data.errorMessage;

            if (state === "fail" || state === "failed") {
                console.warn(
                    `[Kie.ai Unified] Задача не удалась: taskId=${taskId}, error=${errorMessage}`,
                );
            } else {
                console.log(
                    `[Kie.ai Unified] Статус: taskId=${taskId}, state=${state}, mapped=${mappedStatus}`,
                );
            }

            return {
                status: mappedStatus,
                url: resultUrl,
                resultUrls: resultUrls.length > 0 ? resultUrls : undefined,
                error: errorMessage,
            };
        },

        async getTaskResult(taskId: string): Promise<SavedFileInfo[]> {
            const model = await getModelByTaskId(taskId);
            if (!model) {
                throw new Error(
                    `Не удалось определить модель для taskId=${taskId}`,
                );
            }
            const data = await getTaskStatus(taskId, model);
            const state = data.state || data.status || "waiting";

            if (
                state !== "success" &&
                state !== "completed" &&
                state !== "done"
            ) {
                throw new Error(
                    `Задача не завершена: state=${state}, taskId=${taskId}`,
                );
            }

            const resultUrls = extractResultUrls(data, model);

            if (resultUrls.length === 0) {
                throw new Error(`Нет результатов задачи: taskId=${taskId}`);
            }

            console.log(
                `[Kie.ai Unified] Скачивание ${resultUrls.length} результатов...`,
            );

            const files: SavedFileInfo[] = [];
            for (const url of resultUrls) {
                const savedFile = await saveFileFromUrl(url);
                files.push(savedFile);
            }

            console.log(`[Kie.ai Unified] Сохранено файлов: ${files.length}`);
            return files;
        },
    };
}
