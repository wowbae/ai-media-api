// Роуты для работы с моделями
import { Router, Request, Response } from "express";
import { getAvailableModels } from "../generation.service";
import { parseAppMode, isModelAllowedForMode } from "../app-mode";
import type { MediaModel } from "../interfaces";

export function createModelsRouter(): Router {
    const router = Router();

    // Получить доступные модели
    router.get("/models", (req: Request, res: Response) => {
        try {
            const appMode = parseAppMode(req.query.appMode);
            const models = getAvailableModels().filter((model) =>
                isModelAllowedForMode(model.key as MediaModel, appMode),
            );
            res.json({ success: true, data: models });
        } catch (error) {
            console.error("Ошибка получения моделей:", error);
            res.status(500).json({
                success: false,
                error: "Ошибка получения моделей",
            });
        }
    });

    return router;
}
