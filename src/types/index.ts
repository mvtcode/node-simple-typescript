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

export interface ProcessedImage {
    url: string;
    description: string;
    ocrText: string[];
}

// export interface R2Config {
//     accountId: string;
//     accessKeyId: string;
//     secretAccessKey: string;
//     bucketName: string;
//     publicUrl: string;
//     apiKey: string;
// }
