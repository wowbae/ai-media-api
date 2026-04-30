import { Prisma } from "@prisma/client";
import { APP_MODES, type AppMode } from "./app-mode";

/**
 * Фильтр по settings.appMode в Json (MediaRequest, MediaChat).
 * Для «default» включаем явное "default" и отсутствие ключа / JSON-null (Prisma не принимает equals: null).
 */
export function prismaWhereForRequestAppMode(
    appMode: AppMode,
): Prisma.MediaRequestWhereInput {
    if (appMode === APP_MODES.AI_MODEL) {
        return {
            settings: {
                path: ["appMode"],
                equals: APP_MODES.AI_MODEL,
            },
        };
    }
    return {
        OR: [
            {
                settings: {
                    path: ["appMode"],
                    equals: APP_MODES.DEFAULT,
                },
            },
            {
                settings: {
                    path: ["appMode"],
                    equals: Prisma.AnyNull,
                },
            },
        ],
    };
}

export function prismaWhereForChatAppMode(
    appMode: AppMode,
): Prisma.MediaChatWhereInput {
    if (appMode === APP_MODES.AI_MODEL) {
        return {
            settings: {
                path: ["appMode"],
                equals: APP_MODES.AI_MODEL,
            },
        };
    }
    return {
        OR: [
            {
                settings: {
                    path: ["appMode"],
                    equals: APP_MODES.DEFAULT,
                },
            },
            {
                settings: {
                    path: ["appMode"],
                    equals: Prisma.AnyNull,
                },
            },
        ],
    };
}
