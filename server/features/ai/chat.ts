import { getChatHistoryFromTelegram } from '../telegram/userbot/service/get.chat.history';
import { aiConfig } from './config';

// Локальный тип для ролей AI (раньше был в Prisma)
type RoleAi = 'system' | 'user' | 'assistant';

type Message = {
    role: RoleAi;
    content: string;
};

// Хранилище истории сообщений: userId -> массив сообщений
export const conversationHistory = new Map<string, Message[]>();

// Отправка запроса к chat completions
async function sendChatRequest(messages: Message[]): Promise<string> {
    const response = await fetch(`${aiConfig.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${aiConfig.apiKey}`,
        },
        body: JSON.stringify({
            model: aiConfig.model,
            messages,
            temperature: aiConfig.temperature,
            max_tokens: aiConfig.max_tokens,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ошибка API: ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

// Инициализация истории для нового пользователя
function initUserHistory(userId: string): Message[] {
    const messages: Message[] = [];

    // Добавляем системный промпт если есть
    if (aiConfig.systemPrompt) {
        messages.push({
            role: 'system',
            content: aiConfig.systemPrompt,
        });
    }

    conversationHistory.set(userId, messages);
    return messages;
}

// Ограничение контекста (оставляем только последние N сообщений)
function limitContext(messages: Message[], maxMessages: number): Message[] {
    // Сохраняем системное сообщение если оно есть
    const systemMessage =
        messages.find((m) => m.role === 'system') || null;
    const otherMessages = messages.filter((m) => m.role !== 'system');

    // Берем последние N сообщений
    const limitedMessages = otherMessages.slice(-maxMessages);

    // Возвращаем системное сообщение + ограниченную историю
    return systemMessage
        ? [systemMessage, ...limitedMessages]
        : limitedMessages;
}

// Основная функция для отправки сообщения
export async function aiChat(
    userId: string,
    userMessage: string
): Promise<string> {
    // Получаем или создаем историю для пользователя
    let history = conversationHistory.get(userId);

    if (!history) {
        history = initUserHistory(userId);

        const tgHistoryRaw = await getChatHistoryFromTelegram(userId);
        // @ts-ignore
        const tgHistoryFormatted = tgHistoryRaw.messages
            // .filter((m) => m.senderId !== userId) // фильтрует только сообщения от пользователя
            .map((m) => ({
                role: m.senderId === userId ? 'user' : 'assistant' as RoleAi,
                content: m.message,
            }));

        history.push(...tgHistoryFormatted);
    }

    // Добавляем сообщение пользователя
    history.push({
        role: 'user',
        content: userMessage,
    });

    // Ограничиваем контекст если задан maxContext
    const maxContext = aiConfig.maxContext || 20;
    const messagesToSend = limitContext(history, maxContext);

    // Получаем ответ от API
    const assistantReply = await sendChatRequest(messagesToSend);

    // Сохраняем ответ в историю
    conversationHistory.set(userId, [
        ...history,
        {
            role: 'assistant',
            content: assistantReply,
        },
    ]);

    return assistantReply;
}

// Очистка истории пользователя
export function clearHistory(userId: string): void {
    conversationHistory.delete(userId);
}

// Получение истории пользователя
export function getHistory(userId: string): Message[] | undefined {
    return conversationHistory.get(userId);
}

// Установка системного промпта для конкретного пользователя
export function setSystemPrompt(userId: string, prompt: string): void {
    let history = conversationHistory.get(userId);
    if (!history) {
        history = initUserHistory(userId);
    }

    // Обновляем или добавляем системное сообщение
    if (history[0]?.role === 'system') {
        history[0].content = prompt;
    } else {
        history.unshift({
            role: 'system',
            content: prompt,
        });
    }
}

// Экспорт типа для использования в других файлах
export type { Message };
