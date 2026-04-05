// Утилиты для кеширования видео в браузере через Cache API
const CACHE_NAME = 'video-cache-v1';

/**
 * Кеширует видео по URL
 * @param url URL видео для кеширования
 * @param fileId ID файла для использования в качестве ключа кеша
 */
export async function cacheVideo(url: string, fileId: number): Promise<void> {
  if (!('caches' in window)) {
    console.warn('[VideoCache] Cache API не поддерживается');
    return;
  }

  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await fetch(url);

    if (response.ok) {
      await cache.put(`video-${fileId}`, response.clone());
      console.log(`[VideoCache] ✅ Видео закешировано: fileId=${fileId}`);
    } else {
      console.warn(`[VideoCache] ⚠️ Не удалось загрузить видео для кеширования: ${response.status}`);
    }
  } catch (error) {
    console.warn('[VideoCache] ❌ Ошибка кеширования видео:', error);
  }
}

/**
 * Получает видео из кеша
 * @param fileId ID файла
 * @returns Response из кеша или null если не найдено
 */
export async function getCachedVideo(fileId: number): Promise<Response | null> {
  if (!('caches' in window)) {
    return null;
  }

  try {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(`video-${fileId}`);

    if (cached) {
      console.log(`[VideoCache] ✅ Видео найдено в кеше: fileId=${fileId}`);
    }

    return cached || null;
  } catch (error) {
    console.warn('[VideoCache] ❌ Ошибка получения из кеша:', error);
    return null;
  }
}

/**
 * Очищает весь кеш видео
 */
export async function clearVideoCache(): Promise<void> {
  if (!('caches' in window)) {
    return;
  }

  try {
    await caches.delete(CACHE_NAME);
    console.log('[VideoCache] ✅ Кеш видео очищен');
  } catch (error) {
    console.warn('[VideoCache] ❌ Ошибка очистки кеша:', error);
  }
}

/**
 * Получает размер кеша видео (приблизительно)
 * @returns Размер кеша в байтах
 */
export async function getCacheSize(): Promise<number> {
  if (!('caches' in window)) {
    return 0;
  }

  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    let totalSize = 0;

    for (const key of keys) {
      const response = await cache.match(key);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }

    return totalSize;
  } catch (error) {
    console.warn('[VideoCache] ❌ Ошибка получения размера кеша:', error);
    return 0;
  }
}
