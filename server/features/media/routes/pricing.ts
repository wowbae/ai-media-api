import { Router, Request, Response } from 'express';
import { pricing } from '../pricing';

export function createPricingRouter(): Router {
    const router = Router();

    router.get('/pricing', (_req: Request, res: Response) => {
        const data = Object.fromEntries(
            Object.entries(pricing).map(([model, entry]) => [
                model,
                { usd: entry.finalPrice, tokens: entry.tokens },
            ])
        );

        res.json({ success: true, data });
    });

    return router;
}
