// Расширение типов Express для типизации user в запросах
import { UserRole } from '@prisma/client';
import { JwtPayload } from '../features/auth/auth.service';

declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}

// Пустой экспорт для модульности
export {};
