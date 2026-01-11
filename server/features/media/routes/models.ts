// Роуты для работы с моделями
import { Router, Request, Response } from 'express';
import { getAvailableModels } from '../generation.service';

export function createModelsRouter(): Router {
    const router = Router();

    // Получить доступные модели
    router.get('/models', (_req: Request, res: Response) => {
        try {
            const models = getAvailableModels();
            res.json({ success: true, data: models });
        } catch (error) {
            console.error('Ошибка получения моделей:', error);
            res.status(500).json({
                success: false,
                error: 'Ошибка получения моделей',
            });
        }
    });

    return router;
}
