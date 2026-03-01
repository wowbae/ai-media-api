/**
 * SSE (Server-Sent Events) routes для real-time уведомлений
 */
import { Router } from 'express';
import { getSSEService } from '../sse.service';
import { authenticate, authenticateSSE } from '../../auth/routes';

/**
 * Создать SSE роуты
 */
export function createSSERouter(): Router {
    const router = Router();
    const sseService = getSSEService();

    /**
     * SSE подключение для real-time уведомлений
     * GET /sse
     *
     * Устанавливает постоянное соединение для получения событий о завершении генерации
     * Формат событий:
     * - REQUEST_COMPLETED: задача завершена успешно
     * - REQUEST_FAILED: задача завершилась с ошибкой
     * - REQUEST_PROCESSING: задача в процессе выполнения (опционально)
     */
    router.get('/sse', authenticateSSE, (req, res) => {
        const userId = (req as any).user?.userId || (req as any).user?.id;

        if (!userId) {
            console.warn('[SSE] ⚠️ Пользователь не авторизован');
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Отключаем таймаут сокета — SSE должен жить бесконечно
        req.socket?.setTimeout(0);
        req.socket?.setKeepAlive(true, 10000);

        // Настраиваем заголовки для SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no'); // Отключаем буферизацию nginx

        // Генерируем уникальный ID клиента
        const clientId = `sse-${userId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

        // Добавляем клиента
        sseService.addClient(clientId, res, userId);

        // Отправляем приветственное событие
        res.write(
            `data: ${JSON.stringify({
                type: 'CONNECTED',
                clientId,
                timestamp: new Date().toISOString(),
            })}\n\n`,
        );

        // Обработка отключения клиента (close и error могут оба сработать — removeClient идемпотентен)
        const handleDisconnect = () => {
            sseService.removeClient(clientId);
        };

        // Heartbeat — каждые 15 сек (баланс между нагрузкой и удержанием соединения)
        const heartbeatInterval = setInterval(() => {
            if (res.writableEnded) {
                clearInterval(heartbeatInterval);
                return;
            }
            res.write(': heartbeat\n\n');
        }, 15000);

        req.on('close', () => {
            clearInterval(heartbeatInterval);
            handleDisconnect();
        });

        // ECONNRESET/aborted — ожидаемо при закрытии клиентом (навигация, HMR, Strict Mode)
        req.on('error', (error: NodeJS.ErrnoException) => {
            const isClientDisconnect =
                error?.code === 'ECONNRESET' ||
                error?.message?.includes('aborted');
            if (!isClientDisconnect) {
                console.error(`[SSE] ❌ Ошибка: ${clientId}`, error);
            }
            handleDisconnect();
        });
    });

    /**
     * Эндпоинт для проверки статуса SSE подключения
     * GET /sse/status
     */
    router.get('/sse/status', (req, res) => {
        const stats = sseService.getStats();
        res.json({
            success: true,
            data: {
                connectedClients: stats.totalClients,
                uniqueUsers: stats.uniqueUsers,
                timestamp: new Date().toISOString(),
            },
        });
    });

    /**
     * Тестовый эндпоинт для отправки события (только для разработки)
     * POST /sse/test
     */
    router.post('/sse/test', authenticate, (req, res) => {
        const userId = (req as any).user?.userId || (req as any).user?.id;
        const { requestId, type = 'REQUEST_COMPLETED' } = req.body;

        if (!requestId) {
            return res.status(400).json({
                success: false,
                error: 'requestId обязателен',
            });
        }

        const status: 'COMPLETED' | 'FAILED' | 'PROCESSING' =
            type === 'REQUEST_COMPLETED'
                ? 'COMPLETED'
                : type === 'REQUEST_FAILED'
                  ? 'FAILED'
                  : 'PROCESSING';

        const event = {
            type,
            requestId,
            chatId: req.body.chatId,
            status,
            timestamp: new Date().toISOString(),
            data: req.body.data || {},
        };

        const sent = sseService.sendToUser(userId, event);

        res.json({
            success: true,
            data: {
                sent,
                event,
            },
        });
    });

    return router;
}
