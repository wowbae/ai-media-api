import { Router, Request, Response } from "express";
import {
    deleteStoredLoraFile,
    listStoredLoraFiles,
    saveLoraBase64File,
} from "../lora-storage.service";

export function createLorasRouter(): Router {
    const router = Router();

    router.get("/loras", async (_req: Request, res: Response) => {
        try {
            const files = await listStoredLoraFiles();
            return res.json({
                success: true,
                data: files,
            });
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Ошибка получения LoRA";
            return res.status(500).json({
                success: false,
                error: message,
            });
        }
    });

    router.post("/loras/upload", async (req: Request, res: Response) => {
        try {
            const { fileBase64, filename } = req.body as {
                fileBase64?: string;
                filename?: string;
            };

            if (!fileBase64 || !filename) {
                return res.status(400).json({
                    success: false,
                    error: "fileBase64 и filename обязательны",
                });
            }

            const stored = await saveLoraBase64File({ fileBase64, filename });
            return res.json({
                success: true,
                data: stored,
            });
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Ошибка загрузки LoRA";
            return res.status(500).json({
                success: false,
                error: message,
            });
        }
    });

    router.delete("/loras/:filename", async (req: Request, res: Response) => {
        try {
            const { filename } = req.params;
            if (!filename) {
                return res.status(400).json({
                    success: false,
                    error: "filename обязателен",
                });
            }

            await deleteStoredLoraFile(filename);
            return res.json({
                success: true,
                data: { filename },
            });
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Ошибка удаления LoRA";
            return res.status(500).json({
                success: false,
                error: message,
            });
        }
    });

    return router;
}
