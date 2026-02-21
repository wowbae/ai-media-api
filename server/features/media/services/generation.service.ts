// Сервис для обработки запросов на генерацию
// Выносит бизнес-логику из роутов
import { prisma } from 'prisma/client';
import { Prisma } from '@prisma/client';
import type { GenerateMediaRequest, MediaModel } from '../interfaces';
import { generateMedia } from './generation.service';
import { TokenService } from '../../tokens/token.service';
import { getModelPricing } from '../pricing';
import { invalidateChatCache } from '../routes/cache';

export interface CreateGenerationResult {
    requestId: number;
    status: string;
    message: string;
}

export interface GenerationError {
    status: number;
    error: string;
}

export class GenerationService {
    /**
     * Создать запрос на генерацию
     */
    static async createGeneration(
        userId: number,
        data: GenerateMediaRequest
    ): Promise<CreateGenerationResult | GenerationError> {
        const {
            chatId,
            prompt,
            model,
            inputFiles,
            format,
            quality,
            videoQuality,
            duration,
            ar,
            sound,
            fixedLens,
            outputFormat,
            negativePrompt,
            seed,
            cfgScale,
            tailImageUrl,
            voice,
            stability,
            similarityBoost,
            speed,
            languageCode,
            generationType,
            originalTaskId,
        } = data;

        // Валидация
        if (!chatId || typeof chatId !== 'number' || isNaN(chatId)) {
            return { status: 400, error: 'chatId обязателен и должен быть числом' };
        }

        if (!prompt || prompt.trim().length === 0) {
            return { status: 400, error: 'Промпт обязателен' };
        }

        // Проверяем существование чата
        const chat = await prisma.mediaChat.findUnique({
            where: { id: chatId },
        });

        if (!chat) {
            return { status: 404, error: 'Чат не найден' };
        }

        // Определяем модель
        const selectedModel: MediaModel = model || (chat.model as MediaModel);

        // Рассчитываем стоимость
        const pricing = getModelPricing(selectedModel as any);
        const costUsd = pricing?.finalPrice ?? null;
        const costTokens = pricing?.tokens ?? null;

        // Проверяем баланс
        if (costTokens && costTokens > 0) {
            const balance = await TokenService.getBalance(userId);
            if (balance < costTokens) {
                return { status: 402, error: 'Недостаточно токенов' };
            }
        }

        // Проверяем дубликаты
        const recentRequest = await prisma.mediaRequest.findFirst({
            where: {
                chatId,
                prompt: prompt.trim(),
                status: { in: ['PENDING', 'PROCESSING'] },
                createdAt: { gte: new Date(Date.now() - 5000) },
            },
            orderBy: { createdAt: 'desc' },
        });

        if (recentRequest) {
            return {
                status: 202,
                requestId: recentRequest.id,
                status: recentRequest.status,
                message: 'Запрос уже обрабатывается',
            } as CreateGenerationResult;
        }

        // Создаём настройки запроса
        const requestSettings: Record<string, unknown> = {};
        if (format !== undefined) requestSettings.format = format;
        if (quality !== undefined) requestSettings.quality = quality;
        if (videoQuality !== undefined) requestSettings.videoQuality = videoQuality;
        if (duration !== undefined) requestSettings.duration = duration;
        if (ar !== undefined) requestSettings.ar = ar;
        if (generationType !== undefined) requestSettings.generationType = generationType;
        if (sound !== undefined) requestSettings.sound = sound;
        if (fixedLens !== undefined) requestSettings.fixedLens = fixedLens;
        if (outputFormat !== undefined) requestSettings.outputFormat = outputFormat;
        if (negativePrompt !== undefined && negativePrompt.trim() !== '') {
            requestSettings.negativePrompt = negativePrompt;
        }
        if (cfgScale !== undefined) requestSettings.cfgScale = cfgScale;
        if (tailImageUrl !== undefined && tailImageUrl.trim() !== '') {
            requestSettings.tailImageUrl = tailImageUrl;
        }
        if (voice !== undefined && voice.trim() !== '') {
            requestSettings.voice = voice;
        }
        if (stability !== undefined) requestSettings.stability = stability;
        if (similarityBoost !== undefined) requestSettings.similarityBoost = similarityBoost;
        if (speed !== undefined) requestSettings.speed = speed;
        if (languageCode !== undefined && languageCode.trim() !== '') {
            requestSettings.languageCode = languageCode;
        }

        // Создаём запрос в БД
        const mediaRequest = await prisma.mediaRequest.create({
            data: {
                chatId,
                prompt: prompt.trim(),
                model: selectedModel,
                inputFiles: inputFiles || [],
                status: 'PENDING',
                seed: seed !== undefined && seed !== null && String(seed).trim() !== ''
                    ? String(seed)
                    : null,
                settings: requestSettings as Prisma.InputJsonValue,
                costUsd: costUsd !== null ? new Prisma.Decimal(costUsd) : null,
                costTokens: costTokens ?? null,
            },
        });

        // Списываем токены
        if (costTokens && costTokens > 0) {
            try {
                await TokenService.deductTokens(
                    userId,
                    costTokens,
                    `Generation: ${selectedModel}`,
                    mediaRequest.id
                );
            } catch (e) {
                console.error('[GenerationService] Failed to deduct tokens:', e);
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
            prompt: prompt.trim(),
            model: selectedModel,
            inputFiles: inputFiles || [],
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
            voice,
            stability,
            similarityBoost,
            speed,
            languageCode,
        }).catch((error) => {
            console.error('[GenerationService] Ошибка генерации:', error);
        });

        return {
            requestId: mediaRequest.id,
            status: mediaRequest.status,
            message: 'Запрос на генерацию принят',
        };
    }
}
