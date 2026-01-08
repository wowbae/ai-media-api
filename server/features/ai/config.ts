// Конфигурация ассистента
import 'dotenv/config';

export const aiConfig = {
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_API || 'https://gptunnel.ru/v1',
    model: 'gpt-4o-mini',
    temperature: 0.7,
    max_tokens: 150,
    assistantCode: process.env.ASSISTANT_CODE, // код ассистента из веб-интерфейса
    maxContext: 20, // количество сообщений для запоминания
    systemPrompt:
        'Ты - умный ассистент, который может помогать с различными вопросами, отвечай на том же языке, что и собеседник.',
};
 