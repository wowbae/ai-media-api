// Сервис для отслеживания и периодической проверки статуса асинхронных задач
// Проверка статуса задач и отправка SSE уведомлений
import { prisma } from "prisma/client";
import { getProviderManager } from "./providers";
import { getSSEService } from "./sse.service";
import type { MediaModel } from "./interfaces";
import {
    handleTaskCompleted,
    handleTaskFailed,
} from "./completion-handler.service";
import type { SSEEvent } from "./sse.service";

interface TrackedTask {
    requestId: number;
    taskId: string;
    model: MediaModel;
    prompt: string;
    chatId: number;
    userId?: number; // Опционально - только для SSE уведомлений
    createdAt: number;
    lastCheckedAt?: number;
    checkCount: number;
}

class TaskTrackingService {
    private trackedTasks: Map<string, TrackedTask> = new Map();
    private statusCheckTimeouts: Map<string, NodeJS.Timeout> = new Map();
    private readonly CHECK_DELAYS = [
        2000, 5000, 10000, 15000, 20000, 30000,
    ] as const;
    private readonly MAX_CHECK_TIME = 10 * 60 * 1000; // 10 минут макс. время проверки
    private readonly CLEANUP_INTERVAL = 60 * 1000; // Очистка каждую минуту

    constructor() {
        // Запускаем периодическую очистку старых задач
        setInterval(() => this.cleanupOldTasks(), this.CLEANUP_INTERVAL);
        // Периодически восстанавливаем зависшие COMPLETING (каждые 30 сек)
        setInterval(() => this.recoverStuckCompleting(), 30000);
        console.log("[TaskTracking] Сервис запущен");

        // Восстанавливаем незавершенные задачи после перезапуска сервера
        this.recoverPendingTasks();
    }

    /**
     * Восстановить незавершенные задачи из БД
     */
    private async recoverPendingTasks(): Promise<void> {
        try {
            const { prisma } = await import("prisma/client");

            // COMPLETING без файлов — краш до сохранения, возвращаем в PROCESSING для повтора
            const completingWithoutFiles = await prisma.mediaRequest.findMany({
                where: {
                    status: "COMPLETING",
                    taskId: { not: null },
                    files: { none: {} },
                },
                select: { id: true },
            });
            for (const r of completingWithoutFiles) {
                await prisma.mediaRequest.update({
                    where: { id: r.id },
                    data: { status: "PROCESSING" },
                });
            }
            if (completingWithoutFiles.length > 0) {
                console.log(
                    `[TaskTracking] Возвращено ${completingWithoutFiles.length} COMPLETING без файлов в PROCESSING`,
                );
            }

            await this.recoverStuckCompleting();

            const pendingRequests = await prisma.mediaRequest.findMany({
                where: {
                    status: { in: ["PENDING", "PROCESSING"] },
                    taskId: { not: null },
                },
                select: {
                    id: true,
                    taskId: true,
                    model: true,
                    prompt: true,
                    chatId: true,
                    userId: true,
                    createdAt: true,
                },
            });

            if (pendingRequests.length === 0) {
                console.log(
                    "[TaskTracking] Нет незавершенных задач для восстановления",
                );
                return;
            }

            console.log(
                `[TaskTracking] 🔄 Восстановление ${pendingRequests.length} незавершенных задач...`,
            );

            let recovered = 0;
            for (const request of pendingRequests) {
                if (!request.taskId) {
                    console.warn(
                        `[TaskTracking] ⚠️ Пропущена задача requestId=${request.id}: нет taskId`,
                    );
                    continue;
                }

                // Проверяем, не слишком ли старая задача (больше 15 минут)
                const age = Date.now() - request.createdAt.getTime();
                if (age > 15 * 60 * 1000) {
                    console.warn(
                        `[TaskTracking] ⏰ Пропущена старая задача requestId=${request.id}: возраст ${Math.round(age / 1000)} сек`,
                    );
                    // Помечаем как failed
                    await prisma.mediaRequest.update({
                        where: { id: request.id },
                        data: {
                            status: "FAILED",
                            errorMessage:
                                "Задача прервана из-за перезапуска сервера",
                        },
                    });
                    continue;
                }

                // Запускаем отслеживание (userId опционально - только для SSE)
                await this.startTracking({
                    requestId: request.id,
                    taskId: request.taskId,
                    model: request.model as MediaModel,
                    prompt: request.prompt,
                    chatId: request.chatId,
                    userId: request.userId || undefined,
                });

                recovered++;
            }

            console.log(
                `[TaskTracking] ✅ Восстановлено ${recovered} из ${pendingRequests.length} задач`,
            );
        } catch (error) {
            console.error("[TaskTracking] Ошибка восстановления задач:", error);
        }
    }

    /**
     * Начать отслеживание задачи
     */
    async startTracking(params: {
        requestId: number;
        taskId: string;
        model: MediaModel;
        prompt: string;
        chatId: number;
        userId?: number; // Опционально - только для SSE уведомлений
    }): Promise<void> {
        const key = this.getTaskKey(params.requestId);

        // Если уже отслеживается - не добавляем
        if (this.trackedTasks.has(key)) {
            console.log(
                `[TaskTracking] Задача уже отслеживается: requestId=${params.requestId}`,
            );
            return;
        }

        const task: TrackedTask = {
            ...params,
            createdAt: Date.now(),
            checkCount: 0,
        };

        this.trackedTasks.set(key, task);
        console.log(
            `[TaskTracking] 🎯 Начато отслеживание: requestId=${params.requestId}, taskId=${params.taskId}`,
        );

        this.scheduleNextStatusCheck(key, task);
    }

    /**
     * Остановить отслеживание задачи
     */
    stopTracking(requestId: number): void {
        const key = this.getTaskKey(requestId);
        this.clearScheduledStatusCheck(key);
        this.trackedTasks.delete(key);
        console.log(
            `[TaskTracking] ⏹️ Остановлено отслеживание: requestId=${requestId}`,
        );
    }

    /**
     * Получить задержку до следующей проверки по числу проверок
     */
    private getDelay(checkCount: number): number {
        const index = Math.min(checkCount, this.CHECK_DELAYS.length - 1);
        return this.CHECK_DELAYS[index];
    }

    /**
     * Запланировать следующую проверку статуса для задачи
     */
    private scheduleNextStatusCheck(key: string, task: TrackedTask): void {
        const delay = this.getDelay(task.checkCount);
        const timeoutId = setTimeout(() => {
            this.checkTaskStatus(key, task).catch((error) => {
                console.error(
                    "[TaskTracking] Ошибка планировщика статуса:",
                    error,
                );
            });
        }, delay);

        this.statusCheckTimeouts.set(key, timeoutId);
    }

    /**
     * Очистить запланированную проверку статуса для задачи
     */
    private clearScheduledStatusCheck(key: string): void {
        const timeoutId = this.statusCheckTimeouts.get(key);
        if (timeoutId) {
            clearTimeout(timeoutId);
            this.statusCheckTimeouts.delete(key);
        }
    }

    /**
     * Проверить статус задачи
     */
    private async checkTaskStatus(
        key: string,
        task: TrackedTask,
    ): Promise<void> {
        // Проверяем таймаут
        const elapsed = Date.now() - task.createdAt;
        if (elapsed > this.MAX_CHECK_TIME) {
            console.warn(
                `[TaskTracking] ⏰ Таймаут задачи: requestId=${task.requestId}`,
            );
            await this.handleTaskTimeout(task);
            this.stopTracking(task.requestId);
            return;
        }

        task.checkCount++;
        task.lastCheckedAt = Date.now();

        try {
            const providerManager = getProviderManager();
            const provider = providerManager.getProvider(task.model);

            if (!provider.checkTaskStatus) {
                console.error(
                    `[TaskTracking] Провайдер не поддерживает checkTaskStatus: ${provider.name}`,
                );
                this.stopTracking(task.requestId);
                return;
            }

            const status = await provider.checkTaskStatus(task.taskId);

            console.log(
                `[TaskTracking] 📊 Статус задачи: requestId=${task.requestId}, status=${status.status}, checkCount=${task.checkCount}`,
            );

            // Отправляем SSE уведомление о процессе
            if (status.status === "pending" || status.status === "processing") {
                await this.sendSSEProgress(task, status);
                return;
            }

            // Задача завершена успешно
            if (status.status === "done") {
                console.log(
                    `[TaskTracking] ✅ Задача завершена: requestId=${task.requestId}`,
                );

                // Критично: останавливаем polling ДО handleTaskCompleted, иначе интервал
                // (каждые 5 сек) вызовет checkTaskStatus снова, и handleTaskCompleted
                // выполнится несколько раз → тройная отправка в Telegram
                this.stopTracking(task.requestId);

                await this.sendSSECompleted(task);

                await handleTaskCompleted(
                    task.requestId,
                    task.taskId,
                    task.model,
                    task.prompt,
                    status,
                );
                return;
            }

            // Задача не удалась
            if (status.status === "failed") {
                console.warn(
                    `[TaskTracking] ❌ Задача не удалась: requestId=${task.requestId}`,
                );

                this.stopTracking(task.requestId);

                await this.sendSSEFailed(task, status);
                await handleTaskFailed(
                    task.requestId,
                    task.taskId,
                    status,
                    task.model,
                );
                return;
            }
        } catch (error) {
            console.error(
                `[TaskTracking] Ошибка проверки статуса: requestId=${task.requestId}:`,
                error instanceof Error ? error.message : error,
            );

            // При ошибке продолжаем проверку статуса
        } finally {
            if (this.trackedTasks.has(key)) {
                this.scheduleNextStatusCheck(key, task);
            }
        }
    }

    /**
     * Обработать таймаут задачи
     */
    private async handleTaskTimeout(task: TrackedTask): Promise<void> {
        const errorMessage = "Превышено время ожидания генерации (10 минут)";

        await prisma.mediaRequest.update({
            where: { id: task.requestId },
            data: {
                status: "FAILED",
                errorMessage,
            },
        });

        await this.sendSSEFailed(task, {
            status: "failed",
            error: errorMessage,
        });

        console.error(
            `[TaskTracking] ⏰ Таймаут задачи: requestId=${task.requestId}`,
        );
    }

    /**
     * Отправить SSE уведомление о процессе
     */
    private async sendSSEProgress(
        task: TrackedTask,
        status: any,
    ): Promise<void> {
        if (!task.userId) return; // Нет пользователя - не отправляем SSE

        const sseService = getSSEService();
        const event: SSEEvent = {
            type: "REQUEST_PROCESSING",
            requestId: task.requestId,
            chatId: task.chatId,
            status: "PROCESSING",
            timestamp: new Date().toISOString(),
            data: {
                // Можно добавить прогресс если провайдер поддерживает
            },
        };

        sseService.sendToUser(task.userId, event);
    }

    /**
     * Отправить SSE уведомление о завершении
     */
    private async sendSSECompleted(task: TrackedTask): Promise<void> {
        if (!task.userId) return; // Нет пользователя - не отправляем SSE

        const sseService = getSSEService();
        const event: SSEEvent = {
            type: "REQUEST_COMPLETED",
            requestId: task.requestId,
            chatId: task.chatId,
            status: "COMPLETED",
            timestamp: new Date().toISOString(),
        };

        sseService.sendToUser(task.userId, event);
    }

    /**
     * Отправить SSE уведомление об ошибке
     */
    private async sendSSEFailed(task: TrackedTask, status: any): Promise<void> {
        if (!task.userId) return; // Нет пользователя - не отправляем SSE

        const sseService = getSSEService();
        const event: SSEEvent = {
            type: "REQUEST_FAILED",
            requestId: task.requestId,
            chatId: task.chatId,
            status: "FAILED",
            timestamp: new Date().toISOString(),
            data: {
                errorMessage: status.error || "Генерация не удалась",
            },
        };

        sseService.sendToUser(task.userId, event);
    }

    /**
     * Восстановить зависшие COMPLETING с файлами (краш после сохранения)
     */
    private async recoverStuckCompleting(): Promise<void> {
        const stuck = await prisma.mediaRequest.findMany({
            where: {
                status: "COMPLETING",
                files: { some: {} },
            },
            select: { id: true, chatId: true, files: { select: { id: true } } },
        });
        for (const r of stuck) {
            await prisma.mediaRequest.update({
                where: { id: r.id },
                data: { status: "COMPLETED", completedAt: new Date() },
            });
            const { invalidateChatCache } = await import("./routes/cache");
            const { sendSSENotification } =
                await import("./sse-notification.utils");
            invalidateChatCache(r.chatId);
            await sendSSENotification(r.id, "COMPLETED", {
                filesCount: r.files.length,
            });
        }
        if (stuck.length > 0) {
            console.log(
                `[TaskTracking] Восстановлено ${stuck.length} зависших COMPLETING → COMPLETED`,
            );
        }
    }

    /**
     * Очистить старые задачи
     */
    private cleanupOldTasks(): void {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, task] of this.trackedTasks.entries()) {
            const elapsed = now - task.createdAt;
            if (elapsed > this.MAX_CHECK_TIME) {
                this.stopTracking(task.requestId);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            console.log(`[TaskTracking] 🧹 Очищено ${cleaned} старых задач`);
        }
    }

    /**
     * Получить ключ задачи
     */
    private getTaskKey(requestId: number): string {
        return `request_${requestId}`;
    }

    /**
     * Получить статистику
     */
    getStats(): {
        totalTracked: number;
        activeChecks: number;
    } {
        return {
            totalTracked: this.trackedTasks.size,
            activeChecks: this.statusCheckTimeouts.size,
        };
    }
}

// Singleton
const taskTrackingService = new TaskTrackingService();

export function getTaskTrackingService(): TaskTrackingService {
    return taskTrackingService;
}
