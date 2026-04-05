import { aiConfig } from './config';

// Соответствие: userId -> threadId
const threadMap = new Map<string, string>();
// Соответствие: userId -> assistantId
const assistantMap = new Map<string, string>();

export async function createAssistant(instructions: string | undefined, name: string = 'Test'): Promise<string> {
    console.log('createAssistant', aiConfig);

    const response = await fetch(`${aiConfig.baseURL}/assistants`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${aiConfig.apiKey}`,
        },
        body: JSON.stringify({
            model: aiConfig.model,
            instructions: instructions || 'Ты вежливый ассистент, отвечай на языке того, с кем общаешься.',
            name,
        }),
    });

    if (!response.ok) {
        throw new Error(`Ошибка создания ассистента: ${await response.text()}`);
    }

    const data = await response.json();
    return data.id;
}

export async function createThread(): Promise<string> {
    const response = await fetch(`${aiConfig.baseURL}/v1/threads`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${aiConfig.apiKey}`,
        },
        body: JSON.stringify({}),
    });

    if (!response.ok) {
        throw new Error(`Ошибка создания thread: ${await response.text()}`);
    }

    const data = await response.json();
    return data.id;
}

export async function sendMessageByAssistant(
    assistantId: string,
    threadId: string,
    userMessage: string
): Promise<string> {
    const msgResp = await fetch(
        `${aiConfig.baseURL}/v1/threads/${threadId}/messages`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${aiConfig.apiKey}`,
            },
            body: JSON.stringify({
                role: 'user',
                content: userMessage,
            }),
        }
    );

    if (!msgResp.ok) {
        throw new Error(
            `Ошибка отправки запроса ассистенту: ${await msgResp.text()}`
        );
    }

    const runResp = await fetch(
        `${aiConfig.baseURL}/v1/threads/${threadId}/runs`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${aiConfig.apiKey}`,
            },
            body: JSON.stringify({ assistant_id: assistantId }),
        }
    );

    if (!runResp.ok) {
        throw new Error(`Ошибка запуска ассистента: ${await runResp.text()}`);
    }

    const messagesResp = await fetch(
        `${aiConfig.baseURL}/v1/threads/${threadId}/messages`,
        {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${aiConfig.apiKey}`,
            },
        }
    );

    if (!messagesResp.ok) {
        throw new Error(
            `Ошибка получения сообщений: ${await messagesResp.text()}`
        );
    }

    const messagesData = await messagesResp.json();
    const lastAssistantMessage = messagesData.data
        .filter((m: any) => m.role === 'assistant')
        .at(-1);

    return lastAssistantMessage?.content || '';
}

// Главная функция общения с пользователем, параметры берутся из конфигурации
export async function chatWithUser(
    userId: string,
    userMessage: string,
    assistant_id: string | undefined,
    instructions: string | undefined
): Promise<string> {
    // Получить или создать assistantId
    let assistantId = assistant_id || assistantMap.get(userId);

    if (!assistantId) {
        assistantId = await createAssistant(instructions);
        assistantMap.set(userId, assistantId);
    }

    // Получить или создать threadId
    let threadId = threadMap.get(userId);
    if (!threadId) {
        threadId = await createThread();
        threadMap.set(userId, threadId);
    }

    return sendMessageByAssistant(assistantId, threadId, userMessage);
}
