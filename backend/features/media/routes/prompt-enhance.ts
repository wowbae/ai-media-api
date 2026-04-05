import { Router, type Request, type Response } from "express";
import { APP_MODES, parseAppMode } from "../app-mode";
import { enhanceMediaPrompt } from "../prompt-enhancer.service";

export function createPromptEnhanceRouter(): Router {
    const router = Router();

    router.post("/prompt-enhance", async (req: Request, res: Response) => {
        try {
            const appMode = parseAppMode(req.body?.appMode);
            const prompt =
                typeof req.body?.prompt === "string"
                    ? req.body.prompt.trim()
                    : "";
            const attachments = Array.isArray(req.body?.attachments)
                ? req.body.attachments.filter(
                      (value: unknown): value is string =>
                          typeof value === "string" && value.trim().length > 0,
                  )
                : [];

            if (appMode !== APP_MODES.AI_MODEL) {
                return res.status(400).json({
                    success: false,
                    error: "prompt-enhance доступен только в режиме ai-model",
                });
            }
            if (!prompt) {
                return res.status(400).json({
                    success: false,
                    error: "Промпт обязателен",
                });
            }

            const result = await enhanceMediaPrompt({ prompt, attachments });

            return res.json({
                success: true,
                data: result,
            });
        } catch (error) {
            console.error("[PromptEnhance] Ошибка:", error);
            return res.status(500).json({
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Ошибка улучшения промпта",
            });
        }
    });

    return router;
}
