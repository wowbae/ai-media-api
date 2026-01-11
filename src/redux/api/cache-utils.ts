// Утилиты для работы с кешем RTK Query
import type { BaseQueryApi } from '@reduxjs/toolkit/query';
import type {
    MediaChatWithRequests,
    MediaRequest,
    MediaFile,
} from './base';

interface QueryData {
    endpointName?: string;
    data?: MediaChatWithRequests | MediaRequest;
    status: string;
    originalArgs?: { id: number; limit?: number } | number;
}

interface ApiState {
    queries: Record<string, QueryData>;
}

/**
 * Получить состояние API из store
 */
export function getApiState(
    getState: BaseQueryApi['getState'],
    reducerPath: string
): ApiState | null {
    const state = getState() as {
        [key: string]: ApiState;
    };
    return state[reducerPath] || null;
}

/**
 * Проверить, является ли запрос getChat
 */
export function isGetChatQuery(
    queryKey: string,
    queryData: QueryData
): boolean {
    return (
        queryData?.endpointName === 'getChat' ||
        queryKey.includes('"getChat"') ||
        queryKey.startsWith('getChat(')
    );
}

/**
 * Проверить, является ли запрос getRequest
 */
export function isGetRequestQuery(
    queryKey: string,
    queryData: QueryData
): boolean {
    return (
        queryData?.endpointName === 'getRequest' ||
        queryKey.includes('"getRequest"') ||
        queryKey.startsWith('getRequest(')
    );
}

/**
 * Найти чаты, содержащие указанный файл
 */
export function findChatsWithFile(
    queries: Record<string, QueryData>,
    fileId: number
): Array<{
    chat: MediaChatWithRequests;
    args: { id: number; limit?: number };
    queryKey: string;
}> {
    const results: Array<{
        chat: MediaChatWithRequests;
        args: { id: number; limit?: number };
        queryKey: string;
    }> = [];

    for (const [queryKey, queryData] of Object.entries(queries)) {
        if (
            isGetChatQuery(queryKey, queryData) &&
            queryData?.data &&
            queryData.status === 'fulfilled' &&
            queryData.originalArgs &&
            typeof queryData.originalArgs === 'object' &&
            'id' in queryData.originalArgs
        ) {
            const chat = queryData.data as MediaChatWithRequests;
            const hasFile = chat.requests.some((req) =>
                req.files.some((f) => f.id === fileId)
            );

            if (hasFile) {
                results.push({
                    chat,
                    args: queryData.originalArgs as {
                        id: number;
                        limit?: number;
                    },
                    queryKey,
                });
            }
        }
    }

    return results;
}

/**
 * Найти запросы, содержащие указанный файл
 */
export function findRequestsWithFile(
    queries: Record<string, QueryData>,
    fileId: number
): Array<{
    request: MediaRequest;
    requestId: number;
    queryKey: string;
}> {
    const results: Array<{
        request: MediaRequest;
        requestId: number;
        queryKey: string;
    }> = [];

    for (const [queryKey, queryData] of Object.entries(queries)) {
        if (
            isGetRequestQuery(queryKey, queryData) &&
            queryData?.data &&
            queryData.status === 'fulfilled' &&
            typeof queryData.originalArgs === 'number'
        ) {
            const request = queryData.data as MediaRequest;
            if (
                request &&
                'files' in request &&
                Array.isArray(request.files) &&
                request.files.some((f: MediaFile) => f.id === fileId)
            ) {
                results.push({
                    request,
                    requestId: queryData.originalArgs,
                    queryKey,
                });
            }
        }
    }

    return results;
}

/**
 * Обновить файл в чате
 */
export function updateFileInChat(
    draft: MediaChatWithRequests | undefined,
    fileId: number,
    updater: (file: MediaFile) => MediaFile
): void {
    if (draft?.requests) {
        draft.requests = draft.requests.map((req) => ({
            ...req,
            files: req.files.map((f) => (f.id === fileId ? updater(f) : f)),
        }));
    }
}

/**
 * Удалить файл из чата
 */
export function removeFileFromChat(
    draft: MediaChatWithRequests | undefined,
    fileId: number
): void {
    if (draft?.requests) {
        draft.requests = draft.requests.map((req) => ({
            ...req,
            files: req.files.filter((f) => f.id !== fileId),
        }));
    }
}

/**
 * Обновить файл в запросе
 */
export function updateFileInRequest(
    draft: MediaRequest | undefined,
    fileId: number,
    updater: (file: MediaFile) => MediaFile
): void {
    if (draft?.files) {
        draft.files = draft.files.map((f) =>
            f.id === fileId ? updater(f) : f
        );
    }
}

/**
 * Удалить файл из запроса
 */
export function removeFileFromRequest(
    draft: MediaRequest | undefined,
    fileId: number
): void {
    if (draft?.files) {
        draft.files = draft.files.filter((f) => f.id !== fileId);
    }
}
