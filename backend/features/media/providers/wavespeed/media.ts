import type {
    GenerateParams,
    MediaProvider,
    TaskCreatedResult,
    TaskStatusCheckContext,
    TaskStatusResult,
} from "../interfaces";
import type { SavedFileInfo } from "../../file.service";
import type { WavespeedConfig } from "./interfaces";
import { createWavespeedImageHandlers } from "./image";
import { resolveWavespeedBaseUrl } from "./shared";
import { createWavespeedVideoHandlers } from "./video";
import { WAVESPEED_MODEL_MAPPING } from "./payload-mapping";

const WAVESPEED_VIDEO_PAYLOAD_FAMILIES = new Set<
    (typeof WAVESPEED_MODEL_MAPPING)[keyof typeof WAVESPEED_MODEL_MAPPING]["payloadFamily"]
>(["wan2_2_i2v", "wan2_2_i2v_lora", "kling_video_o1"]);

function isImageModel(model: string): boolean {
    const mapping =
        WAVESPEED_MODEL_MAPPING[model as keyof typeof WAVESPEED_MODEL_MAPPING];
    if (!mapping) return false;
    return !WAVESPEED_VIDEO_PAYLOAD_FAMILIES.has(mapping.payloadFamily);
}

export function createWavespeedProvider(
    config: WavespeedConfig,
): MediaProvider {
    const taskResultsCache = new Map<string, SavedFileInfo[]>();
    const taskTypeById = new Map<string, "image" | "video">();
    const taskResultUrlById = new Map<string, string>();
    const apiKey = config.apiKey;
    const baseURL = resolveWavespeedBaseUrl(config.baseURL);

    const imageHandlers = createWavespeedImageHandlers({
        apiKey,
        baseURL,
        taskResultsCache,
        taskResultUrlById,
    });

    const videoHandlers = createWavespeedVideoHandlers({
        apiKey,
        baseURL,
        taskResultsCache,
        taskResultUrlById,
    });

    return {
        name: "wavespeed",
        isAsync: true,

        async generate(params: GenerateParams): Promise<TaskCreatedResult> {
            if (isImageModel(params.model)) {
                const created = await imageHandlers.generateImage(params);
                taskTypeById.set(created.taskId, "image");
                return created;
            }

            const created = await videoHandlers.generateVideo(params);
            taskTypeById.set(created.taskId, "video");
            return created;
        },

        async checkTaskStatus(
            taskId: string,
            context?: TaskStatusCheckContext,
        ): Promise<TaskStatusResult> {
            let taskType = taskTypeById.get(taskId);
            if (!taskType && context?.model) {
                taskType = isImageModel(context.model) ? "image" : "video";
            }
            if (taskType === "image") {
                return imageHandlers.checkImageTaskStatus(taskId, context);
            }

            return videoHandlers.checkVideoTaskStatus(taskId, context);
        },

        async getTaskResult(
            taskId: string,
            context?: TaskStatusCheckContext,
        ): Promise<SavedFileInfo[]> {
            const cached = taskResultsCache.get(taskId);
            if (cached) {
                taskResultsCache.delete(taskId);
                taskTypeById.delete(taskId);
                taskResultUrlById.delete(taskId);
                return cached;
            }

            let taskType = taskTypeById.get(taskId);
            if (!taskType && context?.model) {
                taskType = isImageModel(context.model) ? "image" : "video";
            }
            if (taskType === "image") {
                const result = await imageHandlers.getImageTaskResult(
                    taskId,
                    context,
                );
                taskTypeById.delete(taskId);
                taskResultUrlById.delete(taskId);
                return result;
            }

            const result = await videoHandlers.getVideoTaskResult(
                taskId,
                context,
            );
            taskTypeById.delete(taskId);
            taskResultUrlById.delete(taskId);
            return result;
        },
    };
}
