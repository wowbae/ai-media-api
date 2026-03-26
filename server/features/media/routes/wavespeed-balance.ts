// Роут для получения остатка баланса Wavespeed (GET https://api.wavespeed.ai/api/v3/balance)
import { Router, type Request, type Response } from "express";
import { authenticate } from "../../auth/routes";

const WAVESPEED_BALANCE_URL = "https://api.wavespeed.ai/api/v3/balance";

interface WavespeedBalanceResponse {
    code: number;
    message: string;
    data: {
        balance: number;
    };
}

export function createWavespeedBalanceRouter(): Router {
    const router = Router();

    router.get(
        "/wavespeed-balance",
        authenticate,
        async (_req: Request, res: Response) => {
            const apiKey =
                process.env.WAVESPEED_API_KEY ||
                process.env.WAVESPEED_AI_API_KEY ||
                "";

            if (!apiKey) {
                res.status(503).json({
                    success: false,
                    error: "WAVESPEED_API_KEY не настроен",
                    balance: null,
                });
                return;
            }

            try {
                const response = await fetch(WAVESPEED_BALANCE_URL, {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                    },
                });

                const body =
                    (await response.json()) as WavespeedBalanceResponse;

                if (body.code !== 200) {
                    res.status(response.ok ? 200 : response.status).json({
                        success: false,
                        error: body.message ?? "Ошибка Wavespeed API",
                        balance:
                            typeof body.data?.balance === "number"
                                ? body.data.balance
                                : null,
                    });
                    return;
                }

                res.json({
                    success: true,
                    balance:
                        typeof body.data?.balance === "number"
                            ? body.data.balance
                            : null,
                });
            } catch (error) {
                console.error(
                    "[WavespeedBalance] Ошибка запроса к Wavespeed:",
                    error,
                );
                res.status(502).json({
                    success: false,
                    error:
                        error instanceof Error
                            ? error.message
                            : "Ошибка запроса к Wavespeed",
                    balance: null,
                });
            }
        },
    );

    return router;
}
