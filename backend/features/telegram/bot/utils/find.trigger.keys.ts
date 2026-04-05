import { TriggerKeys } from '../handlers/triggers';

export function findTriggerKeys(
    text: string,
    triggers: Record<TriggerKeys, readonly string[]>
) {
    // разбиваем текст на слова и приводим к нижнему регистру
    const words = text
        .toLowerCase()
        .replace(/[.,!?;:()-]/g, ' ')
        .replace(/\s+/g, ' ')
        .split(' ');

    // Ищем триггеры
    const foundTriggerKeys: TriggerKeys[] = [];
    for (const [key, triggerWords] of Object.entries(triggers)) {
        const match = triggerWords.find((triggerWord) =>
            words.includes(triggerWord)
        );
        if (match) {
            foundTriggerKeys.push(key as TriggerKeys);
        }
    }

    return foundTriggerKeys;
}
