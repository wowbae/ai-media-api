// SSE (Server-Sent Events) сервис для real-time уведомлений о завершении генерации
import type { Response } from 'express';

export interface SSEClient {
  id: string;
  res: Response;
  userId: number;
  createdAt: number;
}

export interface SSEEvent {
  type: 'REQUEST_COMPLETED' | 'REQUEST_FAILED' | 'REQUEST_PROCESSING';
  requestId: number;
  chatId?: number;
  status: 'COMPLETED' | 'FAILED' | 'PROCESSING';
  timestamp: string;
  data?: {
    filesCount?: number;
    errorMessage?: string;
  };
}

class SSEService {
  private clients: Map<string, SSEClient> = new Map();
  private userIdToClient: Map<number, string> = new Map();

  /**
   * Добавить SSE подключение
   */
  addClient(clientId: string, res: Response, userId: number): void {
    const client: SSEClient = {
      id: clientId,
      res,
      userId,
      createdAt: Date.now(),
    };

    this.clients.set(clientId, client);
    this.userIdToClient.set(userId, clientId);

    console.log(`[SSE] Подключен userId=${userId}`);
  }

  /**
   * Удалить SSE подключение
   */
  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      this.userIdToClient.delete(client.userId);
      this.clients.delete(clientId);
      console.log(`[SSE] Отключен userId=${client.userId}`);
    }
  }

  /**
   * Получить clientId по userId
   */
  getClientIdByUserId(userId: number): string | undefined {
    return this.userIdToClient.get(userId);
  }

  /**
   * Отправить событие конкретному пользователю
   */
  sendToUser(userId: number, event: SSEEvent): boolean {
    const clientId = this.userIdToClient.get(userId);
    if (!clientId) {
      console.warn(`[SSE] ⚠️ Пользователь ${userId} не подключен к SSE`);
      return false;
    }

    return this.sendToClient(clientId, event);
  }

  /**
   * Отправить событие конкретному клиенту
   */
  sendToClient(clientId: string, event: SSEEvent): boolean {
    const client = this.clients.get(clientId);
    if (!client) {
      console.warn(`[SSE] ⚠️ Клиент ${clientId} не найден`);
      return false;
    }

    try {
      const data = JSON.stringify(event);
      client.res.write(`data: ${data}\n\n`);
      return true;
    } catch (error) {
      console.error(`[SSE] ❌ Ошибка отправки события:`, error);
      this.removeClient(clientId);
      return false;
    }
  }

  /**
   * Отправить событие всем подключенным клиентам (для отладки)
   */
  broadcast(event: SSEEvent): void {
    console.log(`[SSE] 📢 Broadcast: ${event.type}`);
    for (const clientId of this.clients.keys()) {
      this.sendToClient(clientId, event);
    }
  }

  /**
   * Получить статистику подключений
   */
  getStats(): {
    totalClients: number;
    uniqueUsers: number;
  } {
    return {
      totalClients: this.clients.size,
      uniqueUsers: this.userIdToClient.size,
    };
  }

  /**
   * Очистить все подключения (при shutdown сервера)
   */
  closeAll(): void {
    for (const [clientId, client] of this.clients.entries()) {
      try {
        client.res.end();
      } catch (error) {
        console.error(`[SSE] Ошибка при закрытии клиента ${clientId}:`, error);
      }
    }
    this.clients.clear();
    this.userIdToClient.clear();
    console.log('[SSE] Все подключения закрыты');
  }
}

// Singleton экземпляр
const sseService = new SSEService();

export function getSSEService(): SSEService {
  return sseService;
}

/**
 * Middleware для установки SSE подключения
 */
export function createSSEMiddleware() {
  return (req: any, res: Response, next: any) => {
    // Пропускаем SSE эндпоинт без обработки
    if (req.path === '/sse' || req.path === '/sse/connect') {
      return next();
    }
    next();
  };
}
