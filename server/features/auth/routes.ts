import { Router, Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { z } from 'zod';

const router = Router();

// Validation Schemas
const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

const forgotSchema = z.object({
    email: z.string().email(),
});

const resetSchema = z.object({
    token: z.string(),
    newPassword: z.string().min(6),
});

// Helper for async handlers
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Routes
router.post('/register', asyncHandler(async (req: Request, res: Response) => {
    const data = registerSchema.parse(req.body);
    const result = await AuthService.register(data.email, data.password);
    res.json(result);
}));

router.post('/login', asyncHandler(async (req: Request, res: Response) => {
    const data = loginSchema.parse(req.body);
    const result = await AuthService.login(data.email, data.password);
    res.json(result);
}));

router.post('/forgot-password', asyncHandler(async (req: Request, res: Response) => {
    const data = forgotSchema.parse(req.body);
    await AuthService.requestPasswordReset(data.email);
    // Always return success to prevent email enumeration
    res.json({ message: 'If the email exists, a reset link has been sent' });
}));

router.post('/reset-password', asyncHandler(async (req: Request, res: Response) => {
    const data = resetSchema.parse(req.body);
    await AuthService.resetPassword(data.token, data.newPassword);
    res.json({ message: 'Password reset successful' });
}));

// Middleware to protect routes (export for use in other features)
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Invalid token format' });
    }

    try {
        const payload = AuthService.verifyToken(token);
        // Attach user to request (need to extend Express request type ideally, but for now simple attach)
        (req as any).user = payload;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

router.get('/me', authenticate, asyncHandler(async (req: Request, res: Response) => {
    const userPayload = (req as any).user;
    const user = await AuthService.getCurrentUser(userPayload.userId);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
}));

export const authRouter = router;
