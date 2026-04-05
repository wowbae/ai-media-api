// Роут для получения остатка кредитов Kie.ai (GET https://docs.kie.ai/common-api/get-account-credits)
import { Router, Request, Response } from 'express';
import { authenticate } from '../../auth/routes';

const KIE_CREDIT_URL = 'https://api.kie.ai/api/v1/chat/credit';

interface KieCreditResponse {
    code: number;
    msg: string;
    data: number;
}

export function createKieCreditsRouter(): Router {
    const router = Router();

    router.get('/kie-credits', authenticate, async (_req: Request, res: Response) => {
        const apiKey = process.env.KIEAI_API_KEY;
        if (!apiKey) {
            res.status(503).json({
                success: false,
                error: 'KIEAI_API_KEY не настроен',
                credits: null,
            });
            return;
        }

        try {
            const response = await fetch(KIE_CREDIT_URL, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                },
            });

            const body = (await response.json()) as KieCreditResponse;

            if (body.code !== 200) {
                res.status(response.ok ? 200 : response.status).json({
                    success: false,
                    error: body.msg ?? 'Ошибка Kie.ai API',
                    credits: typeof body.data === 'number' ? body.data : null,
                });
                return;
            }

            res.json({
                success: true,
                credits: typeof body.data === 'number' ? body.data : 0,
            });
        } catch (error) {
            console.error('[KieCredits] Ошибка запроса к Kie.ai:', error);
            res.status(502).json({
                success: false,
                error: error instanceof Error ? error.message : 'Ошибка запроса к Kie.ai',
                credits: null,
            });
        }
    });

    return router;
}
