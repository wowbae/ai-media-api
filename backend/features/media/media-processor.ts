import type { Prisma } from "@prisma/client";
import { prisma } from "prisma/client";
import type { MediaModel } from "./interfaces";
import {
    getProviderManager,
    isTaskCreatedResult,
    type GenerateParams,
    type TaskStatusResult,
} from "./providers";
import type { GenerateMediaOptions } from "./types";
import { saveFilesToDatabase } from "./database.service";
import { sendFilesToTelegram } from "./telegram-notify.service";
import { saveFileFromUrl, type SavedFileInfo } from "./file.service";
import { sendSSENotification } from "./sse-notification.utils";
import { formatErrorMessage } from "./error-utils";
import { invalidateChatCache } from "./routes/cache";

export async function processGeneration(
    options: GenerateMediaOptions,
): Promise<void> {
    const {
        requestId,
        prompt,
        model,
        inputFiles = [],
        format,
        quality,
        videoQuality,
        duration,
        ar,
        generationType,
        originalTaskId,
        sound,
        fixedLens,
        outputFormat,
        negativePrompt,
        seed,
        cfgScale,
        tailImageUrl,
        strength,
        loras,
        voice,
        stability,
        similarityBoost,
        speed,
        languageCode,
        mode,
        multiShots,
        inputVideoFiles,
        characterOrientation,
        triggerWord,
        appMode,
    } = options;

    try {
        const providerManager = getProviderManager();
        const provider = providerManager.getProvider(model);

        await prisma.mediaRequest.update({
            where: { id: requestId },
            data: { status: "PROCESSING" },
        });

        const generateParams: GenerateParams = {
            requestId,
            prompt,
            model,
            inputFiles,
            aspectRatio: format,
            quality,
            videoQuality,
            duration,
            ar,
            generationType,
            originalTaskId,
            sound,
            fixedLens,
            outputFormat,
            negativePrompt,
            seed:
                seed !== undefined &&
                seed !== null &&
                String(seed).trim() !== ""
                    ? String(seed)
                    : undefined,
            cfgScale,
            tailImageUrl,
            strength,
            loras,
            voice,
            stability,
            similarityBoost,
            speed,
            languageCode,
            mode,
            multiShots,
            inputVideoFiles,
            characterOrientation,
            triggerWord,
        };

        const result = await provider.generate(generateParams);

        if (isTaskCreatedResult(result)) {
            const prevRow = await prisma.mediaRequest.findUnique({
                where: { id: requestId },
                select: { settings: true },
            });
            const mergedSettings: Record<string, unknown> =
                prevRow?.settings &&
                typeof prevRow.settings === "object" &&
                !Array.isArray(prevRow.settings)
                    ? { ...(prevRow.settings as Record<string, unknown>) }
                    : {};
            if (result.wavespeedPollUrl) {
                mergedSettings.wavespeedPollUrl = result.wavespeedPollUrl;
            } else {
                delete mergedSettings.wavespeedPollUrl;
            }

            await prisma.mediaRequest.update({
                where: { id: requestId },
                data: {
                    taskId: result.taskId,
                    status: "PENDING",
                    settings: mergedSettings as Prisma.InputJsonValue,
                },
            });

            const request = await prisma.mediaRequest.findUnique({
                where: { id: requestId },
                select: { userId: true, chatId: true },
            });

            if (!request?.chatId) return;

            const { getTaskTrackingService } =
                await import("./task-tracking.service");
            const taskTrackingService = getTaskTrackingService();

            await taskTrackingService.startTracking({
                requestId,
                taskId: result.taskId,
                model,
                prompt,
                chatId: request.chatId,
                userId: request.userId || undefined,
                appMode,
                wavespeedPollUrl: result.wavespeedPollUrl,
            });

            return;
        }

        const savedMediaFiles = await saveFilesToDatabase(requestId, result);

        await sendFilesToTelegram(requestId, savedMediaFiles, prompt).catch(
            () => {},
        );

        await prisma.mediaRequest.update({
            where: { id: requestId },
            data: {
                status: "COMPLETED",
                completedAt: new Date(),
            },
        });

        await sendSSENotification(requestId, "COMPLETED", {
            filesCount: result.length,
        });

        import("./imgbb-upload.service")
            .then(({ uploadFilesToImgbbAndUpdateDatabase }) =>
                uploadFilesToImgbbAndUpdateDatabase(result, requestId, prompt),
            )
            .catch(() => {});
    } catch (error) {
        await handleGenerationError(options.requestId, error, options.model);
        throw error;
    }
}

export async function handleTaskCompletion(
    requestId: number,
    taskId: string,
    model: MediaModel,
    prompt: string,
    status?: TaskStatusResult,
): Promise<void> {
    const existing = await prisma.mediaRequest.findUnique({
        where: { id: requestId },
        select: {
            status: true,
            chatId: true,
            settings: true,
            files: { select: { id: true } },
        },
    });

    if (
        existing?.status !== "COMPLETED" &&
        existing?.files &&
        existing.files.length > 0
    ) {
        await prisma.mediaRequest.update({
            where: { id: requestId },
            data: { status: "COMPLETED", completedAt: new Date() },
        });
        if (existing.chatId) invalidateChatCache(existing.chatId);
        await sendSSENotification(requestId, "COMPLETED", {
            filesCount: existing.files.length,
        });
        return;
    }

    if (existing?.status === "COMPLETED") return;

    const claimed = await prisma.mediaRequest.updateMany({
        where: {
            id: requestId,
            status: { in: ["PENDING", "PROCESSING"] },
        },
        data: { status: "COMPLETING" },
    });

    if (claimed.count === 0) return;

    try {
        const providerManager = getProviderManager();
        const provider = providerManager.getProvider(model);

        if (!provider.getTaskResult) {
            throw new Error(
                `Провайдер ${provider.name} не поддерживает getTaskResult`,
            );
        }

        let savedFiles: SavedFileInfo[];
        if (status?.resultUrls && status.resultUrls.length > 0) {
            savedFiles = await downloadFilesFromUrls(status.resultUrls);
        } else {
            const pollUrl = (
                existing?.settings as { wavespeedPollUrl?: string } | null
            )?.wavespeedPollUrl;
            savedFiles = await provider.getTaskResult(taskId, {
                model,
                wavespeedPollUrl: pollUrl,
            });
        }

        if (!savedFiles.length) {
            throw new Error(
                `Не удалось получить результат задачи: requestId=${requestId}, taskId=${taskId}`,
            );
        }

        const savedMediaFiles = await saveFilesToDatabase(
            requestId,
            savedFiles,
        );
        await sendFilesToTelegram(requestId, savedMediaFiles, prompt).catch(
            () => {},
        );

        const request = await prisma.mediaRequest.update({
            where: { id: requestId },
            data: {
                status: "COMPLETED",
                completedAt: new Date(),
            },
            select: { chatId: true },
        });

        invalidateChatCache(request.chatId);
        await sendSSENotification(requestId, "COMPLETED", {
            filesCount: savedFiles.length,
        });

        import("./imgbb-upload.service")
            .then(({ uploadFilesToImgbbAndUpdateDatabase }) =>
                uploadFilesToImgbbAndUpdateDatabase(
                    savedFiles,
                    requestId,
                    prompt,
                ),
            )
            .then(() => {
                if (request.chatId) invalidateChatCache(request.chatId);
            })
            .catch(() => {});
    } catch (error) {
        const failed = await prisma.mediaRequest.update({
            where: { id: requestId },
            data: {
                status: "FAILED",
                errorMessage:
                    error instanceof Error
                        ? error.message
                        : "Ошибка обработки завершения",
            },
            select: { chatId: true },
        });
        invalidateChatCache(failed.chatId);
        throw error;
    }
}

export async function handleTaskFailure(
    requestId: number,
    taskId: string,
    status: TaskStatusResult,
    model: MediaModel,
): Promise<void> {
    const baseErrorMessage =
        status.error ||
        "Генерация не удалась. Детали ошибки не предоставлены провайдером.";

    const providerManager = getProviderManager();
    const provider = providerManager.getProvider(model);
    const formattedErrorMessage = formatErrorMessage(
        baseErrorMessage,
        model,
        provider.name,
    );

    const updated = await prisma.mediaRequest.update({
        where: { id: requestId },
        data: {
            status: "FAILED",
            errorMessage: formattedErrorMessage,
        },
        select: { chatId: true },
    });
    invalidateChatCache(updated.chatId);

    await sendSSENotification(requestId, "FAILED", {
        errorMessage: formattedErrorMessage,
    });
}

async function handleGenerationError(
    requestId: number,
    error: unknown,
    model: MediaModel,
): Promise<void> {
    const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
    const providerManager = getProviderManager();
    const provider = providerManager.getProvider(model);
    const formattedErrorMessage = formatErrorMessage(
        errorMessage,
        model,
        provider.name,
    );

    await prisma.mediaRequest.update({
        where: { id: requestId },
        data: {
            status: "FAILED",
            errorMessage: formattedErrorMessage,
        },
    });

    await sendSSENotification(requestId, "FAILED", {
        errorMessage: formattedErrorMessage,
    }).catch(() => {});
}

async function downloadFilesFromUrls(urls: string[]): Promise<SavedFileInfo[]> {
    const files: SavedFileInfo[] = [];
    for (const url of urls) {
        files.push(await saveFileFromUrl(url));
    }
    return files;
}
