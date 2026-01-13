import { prisma } from 'prisma/client';
import { TransactionType } from '@prisma/client';

export class TokenService {
  // Get user balance
  static async getBalance(userId: number): Promise<number> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { tokenBalance: true },
    });
    return user?.tokenBalance || 0;
  }

  // Add tokens (Top-up, Bonus, Refund)
  static async addTokens(
      userId: number,
      amount: number,
      description: string,
      type: TransactionType = TransactionType.TOPUP
  ): Promise<number> {
     return prisma.$transaction(async (tx) => {
        // Create transaction record
        await tx.tokenTransaction.create({
            data: {
                userId,
                amount,
                type,
                description
            }
        });

        // Update user balance
        const updatedUser = await tx.user.update({
            where: { id: userId },
            data: { tokenBalance: { increment: amount } }
        });

        return updatedUser.tokenBalance;
     });
  }

  // Deduct tokens (Spend)
  static async deductTokens(
      userId: number,
      amount: number,
      description: string,
      requestId?: number
  ): Promise<number> {
     return prisma.$transaction(async (tx) => {
        // Check balance first
        const user = await tx.user.findUnique({ where: { id: userId } });
        if (!user || user.tokenBalance < amount) {
            throw new Error('Insufficient tokens');
        }

        // Create transaction record
        await tx.tokenTransaction.create({
            data: {
                userId,
                amount: -amount,
                type: TransactionType.SPEND,
                description,
                requestId
            }
        });

        // Update user balance
        const updatedUser = await tx.user.update({
            where: { id: userId },
            data: { tokenBalance: { decrement: amount } }
        });

        return updatedUser.tokenBalance;
     });
  }
}
