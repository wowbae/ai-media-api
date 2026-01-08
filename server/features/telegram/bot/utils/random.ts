import { randomBytes } from 'crypto';

// Генерирует криптографически безопасный ключ из 8 символов (буквы и цифры)
export function randomKey(): string {
    const chars =
        '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    // Генерируем 16 байт для получения 12 случайных символов
    const bytes = randomBytes(16);
    for (let i = 0; i < 12; i++) {
        result += chars[bytes[i] % chars.length];
    }
    return result;
}
