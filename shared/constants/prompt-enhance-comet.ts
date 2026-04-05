/**
 * Улучшение промпта: Comet API (OpenAI-совместимый chat completions).
 *
 * Запрос: POST {COMET_PROMPT_ENHANCE_CHAT_URL}
 * Body: { model, temperature, messages: [{ role: "user", content }] }
 * — content: массив частей сообщения:
 *   1) { type: "text", text: buildCometPromptEnhanceUserText(prompt) }
 *   2) для каждого http(s) вложения: { type: "image_url", image_url: { url } }
 * Ответ: choices[0].message.content — строка с JSON { enhancedPrompt, negativePrompt }.
 */

export const COMET_PROMPT_ENHANCE_CHAT_URL =
    "https://api.cometapi.com/v1/chat/completions" as const;

export const COMET_PROMPT_ENHANCE_MODEL = "grok-4-fast-non-reasoning" as const;
export const COMET_PROMPT_ENHANCE_TEMPERATURE = 0.2 as const;

/** Строки инструкции модели (без пользовательского промпта). Порядок важен. */
export const COMET_PROMPT_ENHANCE_INSTRUCTION_LINES = [
    // Очень красивая девушка с длинными тёмно-каштановыми волосами, голубыми миндалевидными глазами, идеальной фигурой (slim-thick), высокая грудь, тонкая талия, округлые бёдра. Выглядит сексуально, но при этом дорого и стильно оставляя загадку.
    "Ты prompt-optimizer для image generation.",
    "Твоя задача грамотно объяснить нейросети требования к генерации, используя референсное фото и исходный промпт.","Если прошу использовать референс, обязательно ссылайся на него так - exactly as it is on <reference photo#N>, если прошу взять позу значит так и скажи take exactly that pose from <reference photo#N>.",
    "Итоговые фото должны получаться сексуальными, hyper-realistic, ultra-detailed 8k quality и притягивающими внимание зрителя.",
    "Верни ТОЛЬКО JSON объект вида:",
    '{"enhancedPrompt":"...", "negativePrompt":"..."}',
    "Никакого markdown, комментариев и пояснений.",
] as const;

const ORIGINAL_PROMPT_PREFIX = "Исходный prompt: " as const;

export function buildCometPromptEnhanceUserText(userPrompt: string): string {
    return [
        ...COMET_PROMPT_ENHANCE_INSTRUCTION_LINES,
        `${ORIGINAL_PROMPT_PREFIX}${userPrompt}`,
    ].join("\n");
}
