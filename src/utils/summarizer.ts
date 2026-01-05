import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Tạo bản tóm tắt tổng quát (Global Summary) cho tài liệu
 * Tập trung vào Mục đích, Phạm vi và các Thực thể kỹ thuật chính.
 */
export async function generateGlobalSummary(markdownContent: string): Promise<string> {
    console.log('📝 Đang tạo Global Summary cho tài liệu...');

    const SYSTEM_PROMPT = `
Bạn là chuyên gia tóm tắt tài liệu kỹ thuật cho hệ thống RAG.
Nhiệm vụ của bạn là đọc nội dung Markdown và tạo ra một bản tóm tắt "Ngữ cảnh chiến lược" (Strategic Context).

Bản tóm tắt PHẢI bao gồm:
1. Chủ đề chính của tài liệu.
2. Mục tiêu cuối cùng mà tài liệu hướng dẫn người dùng đạt được.
3. Các thực thể quan trọng (Tên Database, Collection, Model AI, Cấu hình phần cứng).
4. Đối tượng độc giả mục tiêu.

Yêu cầu: Ngôn ngữ súc tích, chuyên nghiệp, không dài dòng.
`.trim();

    const USER_PROMPT = `
Dưới đây là toàn bộ nội dung tài liệu Markdown:

---
${markdownContent.substring(0, 15000)} 
---
(Lưu ý: Nếu tài liệu quá dài, tôi đã cắt bớt để phù hợp với context window)

Hãy tạo bản Global Summary dựa trên nội dung trên.
`.trim();

    try {
        const response = await openai.chat.completions.create({
            model: process.env.OPENAI_IMAGE_ANALYTICS_MODEL || "gpt-4o",
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: USER_PROMPT }
            ],
            temperature: 0.3, // Thấp để đảm bảo tính khách quan và chính xác
        });

        return response.choices[0]?.message?.content || "Không thể tạo tóm tắt.";
    } catch (error: any) {
        console.error("❌ Lỗi khi tạo Global Summary:", error.message);
        return "Lỗi trong quá trình tạo tóm tắt tài liệu.";
    }
}