// Роуты для обработки завершения задач генерации
// Используются для webhook от провайдеров или manual проверки статуса
import { Router, Request, Response } from 'express';
import { prisma } from 'prisma/client';
import { getProviderManager } from '../providers';
import type { MediaModel } from '../interfaces';
import { handleTaskCompleted, handleTaskFailed } from '../completion-handler.service';
import { authenticate } from '../../auth/routes';

export function createCompletionRouter(): Router {
    const router = Router();

    /**
     * POST /completion/check/:requestId - Проверить статус задачи вручную
     * Используется когда провайдер не поддерживает webhook
     */
    router.post('/completion/check/:requestId', authenticate, async (req: Request, res: Response) => {
        try {
            const requestId = parseInt(req.params.requestId);
            if (isNaN(requestId)) {
                return res.status(400).json({
                    success: false,
                    error: 'Некорректный ID запроса',
                });
            }

            const request = await prisma.mediaRequest.findUnique({
                where: { id: requestId },
                include: { chat: true },
            });

            if (!request) {
                return res.status(404).json({
                    success: false,
                    error: 'Запрос не найден',
                });
            }

            // Если уже завершён - возвращаем статус
            if (request.status === 'COMPLETED' || request.status === 'FAILED') {
                return res.json({
                    success: true,
                    data: {
                        requestId,
                        status: request.status,
                        message: 'Запрос уже завершён',
                    },
                });
            }

            // Проверяем наличие taskId
            if (!request.taskId) {
                return res.status(400).json({
                    success: false,
                    error: 'taskId отсутствует',
                });
            }

            const model = (request.model || request.chat.model) as MediaModel;
            const providerManager = getProviderManager();
            const provider = providerManager.getProvider(model);

            if (!provider.checkTaskStatus) {
                return res.status(400).json({
                    success: false,
                    error: `Провайдер ${provider.name} не поддерживает проверку статуса`,
                });
            }

            // Проверяем статус задачи
            const status = await provider.checkTaskStatus(request.taskId);

            console.log('[Completion] Статус задачи:', {
                requestId,
                taskId: request.taskId,
                status: status.status,
            });

            if (status.status === 'done') {
                // Завершаем задачу
                await handleTaskCompleted(
                    requestId,
                    request.taskId,
                    model,
                    request.prompt,
                    status
                );

                return res.json({
                    success: true,
                    data: {
                        requestId,
                        status: 'COMPLETED',
                        message: 'Задача завершена успешно',
                    },
                });
            }

            if (status.status === 'failed') {
                // Задача не удалась
                await handleTaskFailed(requestId, request.taskId, status, model);

                return res.json({
                    success: true,
                    data: {
                        requestId,
                        status: 'FAILED',
                        message: 'Задача завершилась с ошибкой',
                    },
                });
            }

            // Всё ещё в процессе
            return res.json({
                success: true,
                data: {
                    requestId,
                    status: status.status.toUpperCase(),
                    message: 'Задача в процессе выполнения',
                },
            });
        } catch (error) {
            console.error('Ошибка проверки статуса:', error);
            res.status(500).json({
                success: false,
                error: 'Ошибка проверки статуса',
            });
        }
    });

    /**
     * POST /completion/webhook/:provider - Webhook от провайдера
     * Используется когда провайдер поддерживает уведомления о завершении
     */
    router.post('/completion/webhook/:provider', async (req: Request, res: Response) => {
        try {
            const { provider } = req.params;
            const { taskId, requestId, status, resultUrls } = req.body;

            console.log('[Completion] Webhook от провайдера:', {
                provider,
                taskId,
                requestId,
                status,
            });

            if (!requestId || !taskId) {
                return res.status(400).json({
                    success: false,
                    error: 'requestId и taskId обязательны',
                });
            }

            const request = await prisma.mediaRequest.findUnique({
                where: { id: requestId },
                include: { chat: true },
            });

            if (!request) {
                return res.status(404).json({
                    success: false,
                    error: 'Запрос не найден',
                });
            }

            const model = (request.model || request.chat.model) as MediaModel;

            if (status === 'completed' || status === 'done') {
                await handleTaskCompleted(
                    requestId,
                    taskId,
                    model,
                    request.prompt,
                    { status: 'done', resultUrls }
                );
            } else if (status === 'failed') {
                await handleTaskFailed(
                    requestId,
                    taskId,
                    { status: 'failed', error: req.body.error },
                    model
                );
            }

            res.json({ success: true });
        } catch (error) {
            console.error('Ошибка обработки webhook:', error);
            res.status(500).json({
                success: false,
                error: 'Ошибка обработки webhook',
            });
        }
    });

    return router;
}
