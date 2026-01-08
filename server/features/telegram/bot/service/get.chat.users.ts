// src/telegram/getAllParticipants.ts
import { TelegramClient, Api } from 'telegram';
import { EntityLike } from 'telegram/define';

/**
 * Получает всех участников чата/супергруппы/канала.
 * chat может быть numeric id (peer id), @username, invite link, или объект EntityLike.
 * Требуются права/доступ userbot'a к чату; некоторые фильтры доступны только админам.
 */
export async function getAllParticipants(
    client: TelegramClient,
    chat: EntityLike,
    opts?: {
        // см. ChannelParticipantsFilter: админы, забаненные и т.д.
        filter?: Api.TypeChannelParticipantsFilter;
        search?: string;
        chunkLimit?: number; // лимит на страницу, по умолчанию оптимально 200
        stopAt?: number; // остановиться после N пользователей (для больших чатов)
        showTotal?: boolean; // сделать доп. запрос за total
    }
) {
    const participants: Api.User[] = [];
    const iterator = client.iterParticipants(chat, {
        filter: opts?.filter,
        search: opts?.search,
        limit: opts?.stopAt ?? Number.MAX_SAFE_INTEGER, // общее желаемое количество
        // iterParticipants сам разобьёт на чанки; chunkLimit влияет косвенно
        // total можно запросить через opts.showTotal
        showTotal: Boolean(opts?.showTotal),
    });

    let count = 0;
    for await (const user of iterator) {
        participants.push(user);
        count++;
        if (opts?.stopAt && count >= opts.stopAt) break;
    }

    return {
        users: participants,
        total: (iterator as any).total ?? undefined, // total доступен, если showTotal = true
    };
}
