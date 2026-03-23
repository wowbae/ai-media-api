// SSE уведомления для клиентов
import { prisma } from "prisma/client";
import { getSSEService } from "./sse.service";
import { APP_MODES } from "./app-mode";

/**
 * Отправить SSE уведомление о завершении задачи
 */
export async function sendSSENotification(
    requestId: number,
    status: "COMPLETED" | "FAILED",
    data?: {
        filesCount?: number;
        errorMessage?: string;
    },
): Promise<void> {
    try {
        const request = await prisma.mediaRequest.findUnique({
            where: { id: requestId },
            include: { chat: true },
        });

        if (!request || !request.chat) {
            console.warn(`[SSE] ⚠️ Request ${requestId} не найден`);
            return;
        }

        const sseService = getSSEService();

        const eventType: "REQUEST_COMPLETED" | "REQUEST_FAILED" =
            status === "COMPLETED" ? "REQUEST_COMPLETED" : "REQUEST_FAILED";

        const event = {
            type: eventType,
            requestId,
            chatId: request.chatId,
            appMode:
                (request.settings as { appMode?: string } | null)?.appMode ===
                APP_MODES.AI_MODEL
                    ? APP_MODES.AI_MODEL
                    : APP_MODES.DEFAULT,
            status,
            timestamp: new Date().toISOString(),
            data,
        };

        const sent = request.chat.userId
            ? sseService.sendToUser(request.chat.userId, event)
            : sseService.sendToChat(request.chatId, event);
        if (!sent) {
            console.warn(
                `[SSE] ⚠️ Не удалось отправить уведомление пользователю ${userId}`,
            );
        }
    } catch (error) {
        console.error(`[SSE] ❌ Ошибка отправки уведомления:`, error);
    }
}
