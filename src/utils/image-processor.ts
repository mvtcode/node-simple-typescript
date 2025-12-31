import OpenAI from "openai";
import { ImageAnalysisJSON } from "../types";

/**
 * ===== OPENAI CLIENT =====
 */
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * ===== SYSTEM PROMPT =====
 * Yêu cầu trả về JSON chuẩn
 */
const SYSTEM_PROMPT = `
Bạn là một công cụ phân tích hình ảnh chuyên nghiệp cho hệ thống RAG.
Nhiệm vụ của bạn là phân tích các hình ảnh kỹ thuật (ảnh chụp màn hình UI, sơ đồ, biểu đồ cấu hình).

QUY TẮC BẮT BUỘC:
1. LUÔN LUÔN trả về định dạng JSON chuẩn.
2. Trích xuất văn bản (OCR) chính xác từng từ.
3. Phân tích ý nghĩa của ảnh dựa trên ngữ cảnh tài liệu được cung cấp.
4. Nếu ảnh có bảng biểu, hãy chuyển đổi nó thành Markdown Table trong trường 'structured_data'.
5. Không tự bịa đặt thông tin không có trong ảnh.
`.trim();

/**
 * ===== USER PROMPT BUILDER =====
 */
function buildUserPrompt(imageUrl: string, context?: string): string {
    return `
NGỮ CẢNH TÀI LIỆU:
${context || "(Không có thông tin ngữ cảnh)"}

NHIỆM VỤ:
Phân tích hình ảnh này và trả về một đối tượng JSON với các trường sau:
- "visual_type": Loại ảnh (Ví dụ: "UI Screenshot", "Architecture Diagram", "Table")
- "description": Mô tả chi tiết những gì ảnh đang thể hiện.
- "ocr_text": Mảng các chuỗi văn bản xuất hiện trong ảnh.
- "structured_data": (Tùy chọn) Chuyển đổi bảng/dữ liệu trong ảnh thành Markdown Table.
- "context_summary": Hình ảnh này giúp trả lời câu hỏi cụ thể nào trong hệ thống RAG?

ĐỊNH DẠNG TRẢ VỀ: JSON.
URL ẢNH: ${imageUrl}
`.trim();
}

/**
 * Phân tích hình ảnh bằng OpenAI Vision với JSON Mode
 */
export async function analyzeImage(
    imageUrl: string,
    context?: string
): Promise<string> {
    const response = await openai.chat.completions.create({
        model: process.env.OPENAI_IMAGE_ANALYTICS_MODEL || "gpt-4o",
        // Kích hoạt JSON Mode để đảm bảo kết quả luôn là JSON
        response_format: { type: "json_object" },
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

    return response.choices[0]?.message?.content || "{}";
}

/**
 * Parse kết quả từ analyzeImage. 
 * Hàm này giờ đây cực kỳ an toàn vì chỉ cần JSON.parse
 */
export function parseImageBlock(imageBlockText: string): {
    description: string;
    ocrText: string[];
} {
    try {
        const data: ImageAnalysisJSON = JSON.parse(imageBlockText);

        // Kết hợp mô tả và dữ liệu cấu trúc (nếu có) để làm description phong phú hơn
        let finalDescription = data.description;
        if (data.structured_data) {
            finalDescription += `\n\n**Dữ liệu bảng từ ảnh:**\n${data.structured_data}`;
        }
        if (data.context_summary) {
            finalDescription += `\n\n**Giá trị RAG:** ${data.context_summary}`;
        }

        return {
            description: finalDescription,
            ocrText: data.ocr_text || [],
        };
    } catch (error) {
        console.error("[parseImageBlock] Lỗi khi parse JSON từ LLM:", error);
        return {
            description: "Không thể phân tích nội dung hình ảnh.",
            ocrText: [],
        };
    }
}