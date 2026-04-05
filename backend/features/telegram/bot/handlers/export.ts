import { addChatComposer } from './add.chat';
import { commandsComposer } from './commands';
import { triggerComposer } from './triggers';
import { textComposer } from './simple.text';
import { callbackComposer } from './callback';
import { getBot } from '../bot.service';

// Агрегированный экспорт одной переменной с композерами.
// Порядок важен: сначала события чата, затем команды, триггеры, и простой текст.
export const handlers = [
    addChatComposer,
    callbackComposer,
    commandsComposer,
    triggerComposer,
    textComposer,
];

// Экспорт бота для совместимости
export function getBotInstance() {
    return getBot();
}
