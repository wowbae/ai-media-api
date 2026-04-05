import {
    buildCometPromptEnhanceUserText,
    COMET_PROMPT_ENHANCE_CHAT_URL,
    COMET_PROMPT_ENHANCE_MODEL,
    COMET_PROMPT_ENHANCE_TEMPERATURE,
} from "@shared/constants/prompt-enhance-comet";

interface EnhancePromptParams {
    prompt: string;
    attachments?: string[];
}

export interface EnhancedPromptResult {
    enhancedPrompt: string;
    negativePrompt: string;
}

function extractJsonObject(raw: string): EnhancedPromptResult | null {
    try {
        const parsed = JSON.parse(raw) as Partial<EnhancedPromptResult>;
        if (!parsed.enhancedPrompt || !parsed.negativePrompt) return null;
        return {
            enhancedPrompt: String(parsed.enhancedPrompt).trim(),
            negativePrompt: String(parsed.negativePrompt).trim(),
        };
    } catch {
        const start = raw.indexOf("{");
        const end = raw.lastIndexOf("}");
        if (start < 0 || end <= start) return null;
        try {
            const parsed = JSON.parse(
                raw.slice(start, end + 1),
            ) as Partial<EnhancedPromptResult>;
            if (!parsed.enhancedPrompt || !parsed.negativePrompt) return null;
            return {
                enhancedPrompt: String(parsed.enhancedPrompt).trim(),
                negativePrompt: String(parsed.negativePrompt).trim(),
            };
        } catch {
            return null;
        }
    }
}

export async function enhanceMediaPrompt(
    params: EnhancePromptParams,
): Promise<EnhancedPromptResult> {
    const apiKey = process.env.COMETAPI_KEY || process.env.COMET_API_KEY;
    if (!apiKey) {
        throw new Error("COMETAPI_KEY или COMET_API_KEY не задан");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    try {
        const attachments = (params.attachments || []).filter(
            (value) => typeof value === "string" && value.trim().length > 0,
        );

        const content: Array<Record<string, unknown>> = [
            {
                type: "text",
                text: buildCometPromptEnhanceUserText(params.prompt),
            },
        ];

        for (const attachment of attachments) {
            if (
                attachment.startsWith("http://") ||
                attachment.startsWith("https://")
            ) {
                content.push({
                    type: "image_url",
                    image_url: {
                        url: attachment,
                    },
                });
            }
        }

        const response = await fetch(COMET_PROMPT_ENHANCE_CHAT_URL, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: COMET_PROMPT_ENHANCE_MODEL,
                temperature: COMET_PROMPT_ENHANCE_TEMPERATURE,
                messages: [
                    {
                        role: "user",
                        content,
                    },
                ],
            }),
            signal: controller.signal,
        });

        const rawText = await response.text();
        if (!response.ok) {
            throw new Error(`Comet API ${response.status}: ${rawText}`);
        }

        const parsedResponse = JSON.parse(rawText) as {
            choices?: Array<{ message?: { content?: string } }>;
        };
        const answer = parsedResponse.choices?.[0]?.message?.content?.trim();
        if (!answer) {
            throw new Error("Модель вернула пустой ответ");
        }

        const parsed = extractJsonObject(answer);
        if (!parsed) {
            throw new Error("Модель вернула ответ в неожиданном формате");
        }

        return parsed;
    } finally {
        clearTimeout(timeout);
    }
}
