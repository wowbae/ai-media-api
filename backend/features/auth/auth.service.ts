import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from 'prisma/client';
import { User, PasswordResetToken, UserRole } from '@prisma/client';
import { authConfig } from '../../config';
import { sendPasswordResetEmail } from './mail.service';

// Payload for JWT
export interface JwtPayload {
    userId: number;
    email: string;
    role: UserRole;
}

export class AuthService {
    // Hash password
    private static async hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, authConfig.bcryptRounds);
    }

    // Register new user
    static async register(email: string, password: string): Promise<{ user: User; token: string }> {
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            throw new Error('User already exists');
        }

        const passwordHash = await this.hashPassword(password);

        // First user is Admin? optional logic, for now just USER
        const userCount = await prisma.user.count();
        const role = userCount === 0 ? UserRole.ADMIN : UserRole.USER;

        const user = await prisma.user.create({
            data: {
                email,
                passwordHash,
                role,
            },
        });

        const token = this.generateToken(user);
        return { user, token };
    }

    // Login user
    static async login(email: string, password: string): Promise<{ user: User; token: string }> {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            throw new Error('Invalid credentials');
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
            throw new Error('Invalid credentials');
        }

        const token = this.generateToken(user);
        return { user, token };
    }

    // Generate JWT
    private static generateToken(user: User): string {
        const payload: JwtPayload = {
            userId: user.id,
            email: user.email,
            role: user.role,
        };
        return jwt.sign(payload, authConfig.jwtSecret, {
            expiresIn: authConfig.jwtExpiresIn,
        } as jwt.SignOptions);
    }

    // Verify Token
    static verifyToken(token: string): JwtPayload {
        return jwt.verify(token, authConfig.jwtSecret) as JwtPayload;
    }

    // Forgot Password
    static async requestPasswordReset(email: string): Promise<boolean> {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return false; // Fail silently for security

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + authConfig.resetTokenExpiresIn);

        // Save to DB
        await prisma.passwordResetToken.create({
            data: {
                token: resetToken,
                userId: user.id,
                expiresAt,
            },
        });

        // Send email
        await sendPasswordResetEmail(user.email, resetToken);
        return true;
    }

    // Reset Password
    static async resetPassword(token: string, newPassword: string): Promise<boolean> {
        const storedToken = await prisma.passwordResetToken.findUnique({
            where: { token },
            include: { user: true },
        });

        if (!storedToken) {
            throw new Error('Invalid or expired token');
        }

        if (storedToken.expiresAt < new Date()) {
            await prisma.passwordResetToken.delete({ where: { id: storedToken.id } });
            throw new Error('Token expired');
        }

        const passwordHash = await this.hashPassword(newPassword);

        // Update user
        await prisma.user.update({
            where: { id: storedToken.userId },
            data: { passwordHash },
        });

        // Delete used token
        await prisma.passwordResetToken.delete({ where: { id: storedToken.id } });

        return true;
    }

    // Get current user (helper)
    static async getCurrentUser(userId: number): Promise<User | null> {
        return prisma.user.findUnique({ where: { id: userId } });
    }
}
