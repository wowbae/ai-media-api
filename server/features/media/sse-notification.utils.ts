// SSE уведомления для клиентов
import { prisma } from "prisma/client";
import { getSSEService } from "./sse.service";

/**
 * Отправить SSE уведомление о завершении задачи
 */
export async function sendSSENotification(
  requestId: number,
  status: 'COMPLETED' | 'FAILED',
  data?: {
    filesCount?: number;
    errorMessage?: string;
  }
): Promise<void> {
  try {
    const request = await prisma.mediaRequest.findUnique({
      where: { id: requestId },
      include: { chat: true },
    });

    if (!request || !request.chat || !request.chat.userId) {
      console.warn(`[SSE] ⚠️ Request ${requestId} не найден или userId отсутствует`);
      return;
    }

    const userId = request.chat.userId;
    const sseService = getSSEService();

    const eventType: 'REQUEST_COMPLETED' | 'REQUEST_FAILED' = 
      status === 'COMPLETED' ? 'REQUEST_COMPLETED' : 'REQUEST_FAILED';

    const event = {
      type: eventType,
      requestId,
      chatId: request.chatId,
      status,
      timestamp: new Date().toISOString(),
      data,
    };

    const sent = sseService.sendToUser(userId, event);
    if (!sent) {
      console.warn(`[SSE] ⚠️ Не удалось отправить уведомление пользователю ${userId}`);
    }
  } catch (error) {
    console.error(`[SSE] ❌ Ошибка отправки уведомления:`, error);
  }
}
