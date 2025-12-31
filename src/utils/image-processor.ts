import OpenAI from "openai";

/**
 * ===== OPENAI CLIENT =====
 */
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * ===== SYSTEM PROMPT =====
 */
const SYSTEM_PROMPT = `
You are an AI image understanding engine for Retrieval-Augmented Generation (RAG).

Your responsibilities:
- Analyze technical images (UI screenshots, diagrams, configuration screens)
- Extract visible text (OCR)
- Understand the semantic meaning of the image
- Ground the image in surrounding document context
- Output a structured IMAGE_BLOCK in Markdown

STRICT RULES:
- Do NOT summarize the document
- Do NOT invent information
- Do NOT guess hidden values
- If something is not visible, leave it empty
- Images are first-class knowledge sources

The output will be embedded and used directly for semantic retrieval.
Accuracy is more important than style.
`.trim();

/**
 * ===== USER PROMPT BUILDER =====
 */
function buildUserPrompt(
    imageUrl: string,
    context?: string
): string {
    return `
DOCUMENT CONTEXT:
${context || "(no surrounding text provided)"}

TASK:
Analyze the image and produce an IMAGE_BLOCK in the following EXACT format:

[IMAGE_BLOCK]
id: auto
url: ${imageUrl}

visual_type: UI | diagram | screenshot | chart | code | other

context:
- application_or_system:
- screen_or_section:
- user_action:

visual_elements:
- buttons:
- menus:
- labels:
- highlighted_fields:

extracted_text:
- (OCR text if any)

semantic_summary:
- What concrete knowledge this image provides
- What question this image helps answer in a RAG system
[/IMAGE_BLOCK]

IMPORTANT:
- Do not hallucinate UI elements
- semantic_summary must be useful for retrieval
`.trim();
}

/**
 * =====================================================
 * 🔒 PUBLIC API – KEEP THIS FUNCTION
 * =====================================================
 * This function is intentionally kept for backward compatibility.
 * Other services depend on it.
 */
export async function analyzeImage(
    imageUrl: string,
    context?: string
): Promise<string> {
    const response = await openai.chat.completions.create({
        model: process.env.OPENAI_IMAGE_ANALYTICS_MODEL!,
        messages: [
            {
                role: "system",
                content: SYSTEM_PROMPT,
            },
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: buildUserPrompt(imageUrl, context),
                    },
                    {
                        type: "image_url",
                        image_url: {
                            url: imageUrl,
                        },
                    },
                ],
            },
        ],
    });

    const outputText = response.choices[0]?.message?.content || "";

    if (!outputText.trim()) {
        throw new Error(
            `[analyzeImage] Empty analysis result for image: ${imageUrl}`
        );
    }

    return outputText.trim();
}

/**
 * ===== OPTIONAL HELPERS (NON-BREAKING) =====
 */

/**
 * Safely trim long context to avoid token overflow
 */
export function trimContext(
    text?: string,
    maxLength = 1500
): string | undefined {
    if (!text) return undefined;
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
}

/**
 * Parse IMAGE_BLOCK response to extract description and OCR text
 */
export function parseImageBlock(imageBlockText: string): {
    description: string;
    ocrText: string[];
} {
    const result = {
        description: "",
        ocrText: [] as string[],
    };

    try {
        // Extract semantic_summary as description
        const summaryMatch = imageBlockText.match(
            /semantic_summary:\s*([\s\S]*?)(?=\[\/IMAGE_BLOCK\]|$)/i
        );
        if (summaryMatch && summaryMatch[1]) {
            const summaryLines = summaryMatch[1]
                .split("\n")
                .map((line) => line.replace(/^-\s*/, "").trim())
                .filter((line) => line.length > 0);
            result.description = summaryLines.join(" ");
        }

        // Extract OCR text
        const ocrMatch = imageBlockText.match(
            /extracted_text:\s*([\s\S]*?)(?=semantic_summary:|$)/i
        );
        if (ocrMatch && ocrMatch[1]) {
            result.ocrText = ocrMatch[1]
                .split("\n")
                .map((line) => line.replace(/^-\s*/, "").trim())
                .filter(
                    (line) =>
                        line.length > 0 &&
                        !line.includes("(OCR text if any)")
                );
        }
    } catch (error) {
        console.error("Error parsing IMAGE_BLOCK:", error);
    }

    return result;
}
