// Роуты для генерации медиа
import { Router, Request, Response } from "express";
import { prisma } from "prisma/client";
import { Prisma } from "@prisma/client";
import { generateMedia } from "../generation.service";
import { copyFile } from "../file.service";
import { mediaStorageConfig, isMediaUrlPubliclyAccessible } from "../config";
import { notifyTelegramGroup } from "../telegram.notifier";
import type { GenerateMediaRequest, MediaModel } from "../interfaces";
import { invalidateChatCache } from "./cache";
import { TokenService } from "../../tokens/token.service";
import { getModelPricing } from "../pricing";
import {
    convertBase64FilesToUrls,
    convertVideoFilesToUrls,
} from "../file-converter.service";
import {
    APP_MODES,
    isAiModelMode,
    isModelAllowedForMode,
    parseAppMode,
} from "../app-mode";
import { AuthService } from "../../auth/auth.service";
import { Z_IMAGE_I2I_LORA_DEFAULT_STRENGTH } from "@shared/constants/wavespeed-z-image";

function resolveUserFromAuthHeader(req: Request): { userId: number } | null {
    const authHeader = req.headers.authorization;
    if (!authHeader) return null;
    const token = authHeader.split(" ")[1];
    if (!token) return null;
    try {
        const payload = AuthService.verifyToken(token);
        return { userId: payload.userId };
    } catch {
        return null;
    }
}

export function createGenerateRouter(): Router {
    const router = Router();

    /**
     * POST /generate - Создать запрос на генерацию
     * Возвращает requestId для отслеживания статуса через SSE
     */
    router.post("/generate", async (req: Request, res: Response) => {
        try {
            const {
                chatId,
                prompt,
                enhancedPrompt,
                model,
                appMode: appModeRaw,
                inputFiles,
                format,
                quality,
                videoQuality,
                duration: durationRaw,
                ar,
                sound,
                fixedLens,
                outputFormat,
                negativePrompt,
                seed,
                cfgScale,
                tailImageUrl,
                strength: strengthRaw,
                loras,
                voice,
                stability,
                similarityBoost,
                speed,
                languageCode,
                generationType,
                originalTaskId,
                inputVideoFiles,
                characterOrientation,
                triggerWord,
            } = req.body as GenerateMediaRequest;
            const appMode = parseAppMode(appModeRaw);
            const user = resolveUserFromAuthHeader(req);

            if (!isAiModelMode(appMode) && !user) {
                return res
                    .status(401)
                    .json({ success: false, error: "Unauthorized" });
            }

            // Преобразуем duration в число
            const duration =
                durationRaw !== undefined && durationRaw !== null
                    ? (() => {
                          const num =
                              typeof durationRaw === "string"
                                  ? parseInt(durationRaw, 10)
                                  : Number(durationRaw);
                          return !isNaN(num) && isFinite(num) ? num : undefined;
                      })()
                    : undefined;

            // Валидация
            if (!chatId || typeof chatId !== "number" || isNaN(chatId)) {
                return res.status(400).json({
                    success: false,
                    error: "chatId обязателен и должен быть числом",
                });
            }

            if (loras !== undefined) {
                if (!Array.isArray(loras)) {
                    return res.status(400).json({
                        success: false,
                        error: "Поле loras должно быть массивом",
                    });
                }

                if (loras.length > 3) {
                    return res.status(400).json({
                        success: false,
                        error: "Можно передать максимум 3 LoRA",
                    });
                }

                const hasInvalidLora = loras.some(
                    (lora) =>
                        !lora ||
                        typeof lora.path !== "string" ||
                        lora.path.trim().length === 0 ||
                        (lora.scale !== undefined &&
                            typeof lora.scale !== "number"),
                );

                if (hasInvalidLora) {
                    return res.status(400).json({
                        success: false,
                        error: "Каждый LoRA должен содержать path (string) и optional scale (number)",
                    });
                }
            }

            // Проверяем существование чата
            const chat = await prisma.mediaChat.findUnique({
                where: { id: chatId },
            });

            if (!chat) {
                return res.status(404).json({
                    success: false,
                    error: "Чат не найден",
                });
            }
            const chatMode = parseAppMode(
                (chat.settings as { appMode?: string } | null)?.appMode,
            );
            if (chatMode !== appMode) {
                return res.status(400).json({
                    success: false,
                    error: "Режим чата не совпадает с режимом запроса",
                });
            }

            // Определяем модель
            const selectedModel: MediaModel =
                model || (chat.model as MediaModel);
            if (!isModelAllowedForMode(selectedModel, appMode)) {
                return res.status(400).json({
                    success: false,
                    error: "Модель недоступна для выбранного режима",
                });
            }

            if (
                selectedModel === "Z_IMAGE_LORA_TRAINER_WAVESPEED" &&
                (!triggerWord || triggerWord.trim().length < 2)
            ) {
                return res.status(400).json({
                    success: false,
                    error: "Для Z-Image LoRA Trainer поле triggerWord обязательно (минимум 2 символа)",
                });
            }

            const promptText = typeof prompt === "string" ? prompt.trim() : "";
            const enhancedPromptText =
                typeof enhancedPrompt === "string" ? enhancedPrompt.trim() : "";
            const isZImageLoraTrainerModel =
                selectedModel === "Z_IMAGE_LORA_TRAINER_WAVESPEED";

            if (!isZImageLoraTrainerModel && promptText.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: "Промпт обязателен",
                });
            }

            const effectivePrompt =
                enhancedPromptText ||
                promptText ||
                (triggerWord?.trim()
                    ? `Train LoRA ${triggerWord.trim()}`
                    : "Train LoRA");

            // Рассчитываем стоимость
            const pricing = getModelPricing(selectedModel as any);
            const costUsd = pricing?.finalPrice ?? null;
            const costTokens = pricing?.tokens ?? null;

            // Проверяем баланс
            if (!isAiModelMode(appMode) && user && (costTokens ?? 0) > 0) {
                const balance = await TokenService.getBalance(user.userId);
                if (balance < (costTokens ?? 0)) {
                    return res.status(402).json({
                        success: false,
                        error: "Недостаточно токенов",
                    });
                }
            }

            // Конвертируем base64 файлы в URL (изображения → imgbb)
            const { processedFiles } =
                await convertBase64FilesToUrls(inputFiles);
            // Конвертируем видео в публичные URL (base64 → сохраняем на сервер, путь → полный URL)
            const { processedVideoFiles } =
                await convertVideoFilesToUrls(inputVideoFiles);

            let strength: number | undefined;
            if (strengthRaw !== undefined && strengthRaw !== null) {
                const n =
                    typeof strengthRaw === "string"
                        ? parseFloat(strengthRaw)
                        : Number(strengthRaw);
                if (!Number.isFinite(n) || n < 0 || n > 1) {
                    return res.status(400).json({
                        success: false,
                        error: "Поле strength должно быть числом от 0 до 1",
                    });
                }
                strength = n;
            }
            if (
                selectedModel === "Z_IMAGE_TURBO_IMAGE_TO_IMAGE_WAVESPEED" &&
                processedFiles.length > 0
            ) {
                if (strength === undefined)
                    strength = Z_IMAGE_I2I_LORA_DEFAULT_STRENGTH;
            }

            // Kling Motion Control: Kie.ai должен скачивать видео по URL — localhost им недоступен
            const isKlingMotionControl =
                selectedModel === "KLING_2_6_MOTION_CONTROL_KIEAI";
            if (
                isKlingMotionControl &&
                processedVideoFiles.length > 0 &&
                !isMediaUrlPubliclyAccessible()
            ) {
                return res.status(400).json({
                    success: false,
                    error:
                        "Kling Motion Control требует публичный URL для видео. " +
                        "Kie.ai не может скачать файл с localhost. " +
                        "Установи MEDIA_PUBLIC_BASE_URL в .env на публичный адрес (например, ngrok для локальной разработки).",
                });
            }

            // Проверяем дубликаты запросов
            const recentRequest = await prisma.mediaRequest.findFirst({
                where: {
                    chatId,
                    prompt: effectivePrompt,
                    status: { in: ["PENDING", "PROCESSING"] },
                    createdAt: { gte: new Date(Date.now() - 5000) },
                },
                orderBy: { createdAt: "desc" },
            });

            if (recentRequest) {
                console.log("[API] ⚠️ Обнаружен дубликат запроса:", {
                    existingRequestId: recentRequest.id,
                    status: recentRequest.status,
                });
                return res.status(202).json({
                    success: true,
                    data: {
                        requestId: recentRequest.id,
                        status: recentRequest.status,
                        message: "Запрос уже обрабатывается",
                    },
                });
            }

            // Сохраняем настройки запроса
            const requestSettings: Record<string, unknown> = {};
            if (format !== undefined) requestSettings.format = format;
            if (quality !== undefined) requestSettings.quality = quality;
            if (videoQuality !== undefined)
                requestSettings.videoQuality = videoQuality;
            if (duration !== undefined) requestSettings.duration = duration;
            if (ar !== undefined) requestSettings.ar = ar;
            if (generationType !== undefined)
                requestSettings.generationType = generationType;
            if (sound !== undefined) requestSettings.sound = sound;
            if (fixedLens !== undefined) requestSettings.fixedLens = fixedLens;
            if (outputFormat !== undefined)
                requestSettings.outputFormat = outputFormat;
            if (negativePrompt !== undefined && negativePrompt.trim() !== "") {
                requestSettings.negativePrompt = negativePrompt;
            }
            if (cfgScale !== undefined) requestSettings.cfgScale = cfgScale;
            if (tailImageUrl !== undefined && tailImageUrl.trim() !== "") {
                requestSettings.tailImageUrl = tailImageUrl;
            }
            if (Array.isArray(loras) && loras.length > 0) {
                requestSettings.loras = loras.slice(0, 3);
            }
            if (voice !== undefined && voice.trim() !== "") {
                requestSettings.voice = voice;
            }
            if (stability !== undefined) requestSettings.stability = stability;
            if (similarityBoost !== undefined)
                requestSettings.similarityBoost = similarityBoost;
            if (speed !== undefined) requestSettings.speed = speed;
            if (languageCode !== undefined && languageCode.trim() !== "") {
                requestSettings.languageCode = languageCode;
            }
            if (enhancedPrompt !== undefined && enhancedPrompt.trim() !== "") {
                requestSettings.enhancedPrompt = enhancedPrompt;
            }
            if (triggerWord !== undefined && triggerWord.trim() !== "") {
                requestSettings.triggerWord = triggerWord.trim();
            }
            if (strength !== undefined) requestSettings.strength = strength;
            requestSettings.appMode = appMode;

            // Создаём запрос в БД
            const mediaRequest = await prisma.mediaRequest.create({
                data: {
                    userId: user?.userId,
                    chatId,
                    prompt: effectivePrompt,
                    model: selectedModel,
                    inputFiles: processedFiles,
                    status: "PENDING",
                    seed:
                        seed !== undefined &&
                        seed !== null &&
                        String(seed).trim() !== ""
                            ? String(seed)
                            : null,
                    settings: requestSettings as Prisma.InputJsonValue,
                    costUsd:
                        costUsd !== null ? new Prisma.Decimal(costUsd) : null,
                    costTokens: costTokens ?? null,
                },
            });

            // Списываем токены
            if (!isAiModelMode(appMode) && user && (costTokens ?? 0) > 0) {
                try {
                    await TokenService.deductTokens(
                        user.userId,
                        costTokens ?? 0,
                        `Generation: ${selectedModel}`,
                        mediaRequest.id,
                    );
                } catch (e) {
                    console.error("[API] Failed to deduct tokens:", e);
                }
            }

            // Инвалидируем кеш и обновляем чат
            invalidateChatCache(chatId);
            await prisma.mediaChat.update({
                where: { id: chatId },
                data: { updatedAt: new Date() },
            });

            // Запускаем генерацию асинхронно
            generateMedia({
                requestId: mediaRequest.id,
                prompt: effectivePrompt,
                enhancedPrompt: enhancedPromptText || undefined,
                appMode,
                model: selectedModel,
                inputFiles: processedFiles,
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
                inputVideoFiles:
                    processedVideoFiles.length > 0
                        ? processedVideoFiles
                        : undefined,
                characterOrientation,
                triggerWord: triggerWord?.trim() || undefined,
            }).catch((error) => {
                console.error("[API] Ошибка генерации:", error);
            });

            res.status(202).json({
                success: true,
                data: {
                    requestId: mediaRequest.id,
                    status: mediaRequest.status,
                    message: "Запрос на генерацию принят",
                },
            });
        } catch (error) {
            console.error("Ошибка создания запроса:", error);
            res.status(500).json({
                success: false,
                error: "Ошибка создания запроса",
            });
        }
    });

    /**
     * POST /generate-test - Тестовый режим (копирование последнего файла из чата)
     * НЕ вызывает нейронку, используется для тестирования
     */
    router.post("/generate-test", async (req: Request, res: Response) => {
        try {
            const { chatId, prompt, seed } = req.body as {
                chatId: number;
                prompt: string;
                seed?: string | number;
            };

            console.log("[API] 🧪 POST /generate-test - ТЕСТОВЫЙ РЕЖИМ:", {
                chatId,
                prompt: prompt?.substring(0, 50),
            });

            if (!chatId || typeof chatId !== "number" || isNaN(chatId)) {
                return res.status(400).json({
                    success: false,
                    error: "chatId обязателен и должен быть числом",
                });
            }

            if (!prompt || prompt.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    error: "Промпт обязателен",
                });
            }

            const chat = await prisma.mediaChat.findUnique({
                where: { id: chatId },
            });

            if (!chat) {
                return res.status(404).json({
                    success: false,
                    error: "Чат не найден",
                });
            }

            // Находим последний файл в чате
            const lastFile = await prisma.mediaFile.findFirst({
                where: {
                    request: { chatId },
                },
                orderBy: { createdAt: "desc" },
            });

            if (!lastFile) {
                return res.status(404).json({
                    success: false,
                    error: "В чате нет файлов для тестового режима",
                });
            }

            // Создаём запрос со статусом COMPLETED
            const mediaRequest = await prisma.mediaRequest.create({
                data: {
                    userId: chat.userId,
                    chatId,
                    prompt: prompt.trim(),
                    model: chat.model,
                    inputFiles: [],
                    status: "COMPLETED",
                    completedAt: new Date(),
                    settings: {
                        appMode: parseAppMode(
                            (chat.settings as { appMode?: string })?.appMode,
                        ),
                    },
                    seed:
                        seed !== undefined &&
                        seed !== null &&
                        String(seed).trim() !== ""
                            ? String(seed)
                            : null,
                },
            });

            if (!lastFile.path) {
                return res.status(400).json({
                    success: false,
                    error: "Последний файл не имеет локального пути",
                });
            }

            // Копируем файл
            const { path: newFilePath, previewPath: newPreviewPath } =
                await copyFile(lastFile.path, lastFile.previewPath);

            // Получаем размер файла
            const { stat } = await import("fs/promises");
            const absolutePath = require("path").isAbsolute(newFilePath)
                ? newFilePath
                : require("path").join(
                      mediaStorageConfig.basePath,
                      newFilePath,
                  );
            const fileStat = await stat(absolutePath);

            // Создаём запись файла
            const newMediaFile = await prisma.mediaFile.create({
                data: {
                    requestId: mediaRequest.id,
                    type: lastFile.type,
                    filename: require("path").basename(newFilePath),
                    path: newFilePath,
                    previewPath: newPreviewPath,
                    size: fileStat.size,
                    width: lastFile.width,
                    height: lastFile.height,
                },
            });

            // Обновляем чат
            await prisma.mediaChat.update({
                where: { id: chatId },
                data: { updatedAt: new Date() },
            });

            invalidateChatCache(chatId);

            console.log("[API] 🧪 Тестовый режим: запрос создан:", {
                requestId: mediaRequest.id,
                fileId: newMediaFile.id,
            });

            // Возвращаем ответ сразу
            res.status(201).json({
                success: true,
                data: {
                    requestId: mediaRequest.id,
                    status: "COMPLETED",
                    message: "Тестовый запрос создан",
                },
            });

            // Отправляем уведомление в Telegram асинхронно
            notifyTelegramGroup(newMediaFile, chat.name, prompt.trim()).catch(
                (error) => {
                    console.error("[API] Ошибка отправки в Telegram:", error);
                },
            );
        } catch (error) {
            console.error("[API] Ошибка создания тестового запроса:", error);
            res.status(500).json({
                success: false,
                error: "Ошибка создания тестового запроса",
            });
        }
    });

    return router;
}
