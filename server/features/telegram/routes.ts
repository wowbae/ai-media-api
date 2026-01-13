import { Router, Request, Response } from 'express';
import { prisma } from 'prisma/client';
import { z } from 'zod';
import { authenticate } from '../auth/routes';

export const telegramRouter = Router();

// Middleware to ensure user is authenticated
telegramRouter.use(authenticate);

// Get all linked groups for the user
telegramRouter.get('/groups', async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const groups = await prisma.telegramGroup.findMany({
            where: { userId: user.userId },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, groups });
    } catch (error) {
        console.error('Error fetching telegram groups:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Add a linked group (simple version: user provides numeric ID)
// Improved version: User provides a verification code or bot adds directly?
// For now, allow direct addition with optional title.
const addGroupSchema = z.object({
    groupId: z.string().or(z.number()).transform(val => BigInt(val)),
    title: z.string().optional(),
});

telegramRouter.post('/groups', async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const result = addGroupSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({ success: false, error: result.error.errors });
        }

        const { groupId, title } = result.data;

        // Check if already linked
        const existing = await prisma.telegramGroup.findFirst({
            where: {
                userId: user.userId,
                groupId: groupId
            }
        });

        if (existing) {
             return res.status(400).json({ success: false, error: 'Group already linked' });
        }

        const group = await prisma.telegramGroup.create({
            data: {
                userId: user.userId,
                groupId: groupId,
                title: title || `Group ${groupId}`,
                isActive: true
            }
        });

        // Convert BigInt to string for JSON
        const responseGroup = {
            ...group,
            groupId: group.groupId.toString()
        };

        res.json({ success: true, group: responseGroup });

    } catch (error) {
        console.error('Error adding telegram group:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Delete (unlink) group
telegramRouter.delete('/groups/:id', async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const id = parseInt(req.params.id);

        await prisma.telegramGroup.deleteMany({
            where: {
                id: id,
                userId: user.userId // Ensure ownership
            }
        });

        res.json({ success: true, message: 'Group unlink' });
    } catch (error) {
        console.error('Error deleting telegram group:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});
