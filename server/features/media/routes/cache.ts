// In-Memory Cache для ускорения запросов к удаленной БД
interface ChatCacheEntry {
    data: unknown;
    timestamp: number;
    limit?: number;
}

const chatCache = new Map<string, ChatCacheEntry>();
const CACHE_TTL = 30000; // 30 секунд

export function getCachedChat(chatId: number, limit?: number): unknown | null {
    const cacheKey = `${chatId}-${limit || 'all'}`;
    const cached = chatCache.get(cacheKey);

    if (!cached) return null;

    // Проверяем TTL
    if (Date.now() - cached.timestamp > CACHE_TTL) {
        chatCache.delete(cacheKey);
        return null;
    }

    return cached.data;
}

export function setCachedChat(
    chatId: number,
    data: unknown,
    limit?: number
): void {
    const cacheKey = `${chatId}-${limit || 'all'}`;
    chatCache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        limit,
    });
}

export function invalidateChatCache(chatId: number): void {
    // Удаляем все варианты кеша для этого чата
    const keysToDelete: string[] = [];
    for (const key of chatCache.keys()) {
        if (key.startsWith(`${chatId}-`)) {
            keysToDelete.push(key);
        }
    }
    keysToDelete.forEach((key) => chatCache.delete(key));
    console.log(`[Cache] Invalidated cache for chat ${chatId}`);
}

// Очистка старого кеша каждые 60 секунд
setInterval(() => {
    const now = Date.now();
    let deletedCount = 0;
    for (const [key, entry] of chatCache.entries()) {
        if (now - entry.timestamp > CACHE_TTL) {
            chatCache.delete(key);
            deletedCount++;
        }
    }
    if (deletedCount > 0) {
        console.log(`[Cache] Cleaned up ${deletedCount} expired entries`);
    }
}, 60000);
