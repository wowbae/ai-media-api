import type {
    GenerateParams,
    MediaProvider,
    TaskCreatedResult,
    TaskStatusResult,
} from "../interfaces";
import type { SavedFileInfo } from "../../file.service";
import type { WavespeedConfig } from "./interfaces";
import { createWavespeedImageHandlers } from "./image";
import { resolveWavespeedBaseUrl } from "./shared";
import { createWavespeedVideoHandlers } from "./video";

function isImageModel(model: string): boolean {
    return model === "Z_IMAGE_TURBO_LORA_WAVESPEED";
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

        async checkTaskStatus(taskId: string): Promise<TaskStatusResult> {
            const taskType = taskTypeById.get(taskId);
            if (taskType === "image") {
                return imageHandlers.checkImageTaskStatus(taskId);
            }

            return videoHandlers.checkVideoTaskStatus(taskId);
        },

        async getTaskResult(taskId: string): Promise<SavedFileInfo[]> {
            const cached = taskResultsCache.get(taskId);
            if (cached) {
                taskResultsCache.delete(taskId);
                taskTypeById.delete(taskId);
                taskResultUrlById.delete(taskId);
                return cached;
            }

            const taskType = taskTypeById.get(taskId);
            if (taskType === "image") {
                const result = await imageHandlers.getImageTaskResult(taskId);
                taskTypeById.delete(taskId);
                taskResultUrlById.delete(taskId);
                return result;
            }

            const result = await videoHandlers.getVideoTaskResult(taskId);
            taskTypeById.delete(taskId);
            taskResultUrlById.delete(taskId);
            return result;
        },
    };
}
