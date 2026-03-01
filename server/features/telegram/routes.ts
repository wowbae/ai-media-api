import { Router, Request, Response } from 'express';
import { prisma } from 'prisma/client';
import { z } from 'zod';
import { authenticate } from '../auth/routes';

export const telegramRouter = Router();

// Middleware to ensure user is authenticated
telegramRouter.use(authenticate);

// Get linked group for the user (one-to-one relationship)
telegramRouter.get('/groups', async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const group = await prisma.telegramGroup.findUnique({
            where: { userId: user.userId }
        });
        res.json({ success: true, group: group || null });
    } catch (error) {
        console.error('Error fetching telegram group:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Add or update linked group (upsert - one group per user)
const addGroupSchema = z.object({
    groupId: z.string(), // Теперь String вместо BigInt
    title: z.string().optional(),
});

telegramRouter.post('/groups', async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const result = addGroupSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({ success: false, error: result.error.issues });
        }

        const { groupId, title } = result.data;

        // Upsert: создаем или обновляем группу (заменяем старую если есть)
        const group = await prisma.telegramGroup.upsert({
            where: { userId: user.userId },
            update: {
                groupId: groupId,
                title: title || `Group ${groupId}`,
            },
            create: {
                userId: user.userId,
                groupId: groupId,
                title: title || `Group ${groupId}`,
            }
        });

        res.json({ success: true, group });

    } catch (error) {
        console.error('Error adding/updating telegram group:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Delete (unlink) group
telegramRouter.delete('/groups', async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;

        await prisma.telegramGroup.delete({
            where: {
                userId: user.userId
            }
        }).catch(() => {
            // Группа может не существовать, это нормально
        });

        res.json({ success: true, message: 'Group unlinked' });
    } catch (error) {
        console.error('Error deleting telegram group:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});
