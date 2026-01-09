// Сервис для работы с базой данных медиа-файлов
import { Prisma, MediaFile } from '@prisma/client';
import { prisma } from 'prisma/client';
import { notifyTelegramGroupBatch } from './telegram.notifier';
import type { SavedFileInfo } from './file.service';

// Сохранение файлов в БД и отправка уведомлений
export async function saveFilesToDatabase(
    requestId: number,
    savedFiles: SavedFileInfo[],
    prompt: string
): Promise<void> {
    const request = await prisma.mediaRequest.findUnique({
        where: { id: requestId },
        include: { chat: true },
    });

    if (!request) {
        throw new Error(`Request не найден: ${requestId}`);
    }

    // Удаляем дубликаты файлов по пути
    const uniqueFiles = savedFiles.filter(
        (file, index, self) =>
            index === self.findIndex((f) => f.path === file.path)
    );

    console.log(
        `[MediaDatabase] Сохранение ${uniqueFiles.length} файлов для requestId=${requestId}`
    );

    const savedMediaFiles: MediaFile[] = [];

    for (const file of uniqueFiles) {
        const mediaFile = await prisma.mediaFile.create({
            data: {
                requestId,
                type: file.type,
                filename: file.filename,
                path: file.path,
                previewPath: file.previewPath,
                size: file.size,
                metadata: file.metadata as Prisma.InputJsonValue,
            },
        });

        console.log(`[MediaDatabase] Файл сохранён: id=${mediaFile.id}`);
        savedMediaFiles.push(mediaFile);
    }

    // Отправляем все файлы группой в Telegram (если есть файлы и чат)
    if (request.chat && savedMediaFiles.length > 0) {
        try {
            const telegramResult = await notifyTelegramGroupBatch(
                savedMediaFiles,
                request.chat.name,
                prompt
            );
            console.log(
                `[MediaDatabase] Telegram: ${telegramResult ? 'отправлено группой' : 'не отправлено'} (${savedMediaFiles.length} файлов)`
            );
        } catch (telegramError) {
            console.error('[MediaDatabase] Ошибка Telegram:', telegramError);
        }
    }
}
