interface EnhancePromptParams {
    prompt: string;
    attachments?: string[];
}

export interface EnhancedPromptResult {
    enhancedPrompt: string;
    negativePrompt: string;
}

const GROK_MODEL = "grok-4.20-0309-reasoning";
const XAI_COMPLETIONS_URL = "https://api.x.ai/v1/chat/completions";

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

export async function enhancePromptWithGrok(
    params: EnhancePromptParams,
): Promise<EnhancedPromptResult> {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
        throw new Error("XAI_API_KEY не задан");
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
                text: [
                    "Ты prompt-optimizer для image generation.",
                    "Верни ТОЛЬКО JSON объект вида:",
                    '{"enhancedPrompt":"...", "negativePrompt":"..."}',
                    "Никакого markdown, комментариев и пояснений.",
                    `Исходный prompt: ${params.prompt}`,
                ].join("\n"),
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

        const response = await fetch(XAI_COMPLETIONS_URL, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: GROK_MODEL,
                temperature: 0.2,
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
            throw new Error(`Grok API ${response.status}: ${rawText}`);
        }

        const parsedResponse = JSON.parse(rawText) as {
            choices?: Array<{ message?: { content?: string } }>;
        };
        const answer = parsedResponse.choices?.[0]?.message?.content?.trim();
        if (!answer) {
            throw new Error("Grok вернул пустой ответ");
        }

        const parsed = extractJsonObject(answer);
        if (!parsed) {
            throw new Error("Grok вернул ответ в неожиданном формате");
        }

        return parsed;
    } finally {
        clearTimeout(timeout);
    }
}
