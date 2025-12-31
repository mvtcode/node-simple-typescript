export interface TextBlock {
    type: 'text';
    content: string;
}

export interface ImageBlock {
    type: 'image';
    imageBuffer: Buffer;
    contentType: string | null;
}

export type ContentBlock = TextBlock | ImageBlock;

// export interface ProcessedImage {
//     url: string;
//     description: string;
//     ocrText: string[];
// }

/**
 * Định nghĩa Interface cho dữ liệu trả về từ LLM
 */
export interface ImageAnalysisJSON {
    visual_type: string;
    description: string;
    ocr_text: string[];
    structured_data?: string; // Markdown table nếu có
    context_summary: string;
}