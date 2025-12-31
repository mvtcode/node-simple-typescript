import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

/**
 * Upload an image buffer to Cloudflare R2 and return the public URL
 */
export async function uploadToR2(
    imageBuffer: Buffer,
    contentType: string | null,
): Promise<string> {
    // Initialize S3 client for Cloudflare R2
    const s3Client = new S3Client({
        region: 'auto',
        endpoint: process.env.R2_ENDPOINT!,
        credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY!,
            secretAccessKey: process.env.R2_SECRET_KEY!,
        },
    });

    // Generate unique filename
    const extension = getExtensionFromContentType(contentType);
    const filename = `images/${uuidv4()}${extension}`;

    // Upload to R2
    const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET!,
        Key: filename,
        Body: imageBuffer,
        ContentType: contentType || 'image/png',
    });

    await s3Client.send(command);

    // Return public URL
    const publicUrl = `${process.env.R2_PUBLIC_DOMAIN!}/${filename}`;
    return publicUrl;
}

/**
 * Get file extension from content type
 */
function getExtensionFromContentType(contentType: string | null): string {
    if (!contentType) return '.png';

    const typeMap: Record<string, string> = {
        'image/png': '.png',
        'image/jpeg': '.jpg',
        'image/jpg': '.jpg',
        'image/gif': '.gif',
        'image/webp': '.webp',
        'image/svg+xml': '.svg',
    };

    return typeMap[contentType] || '.png';
}
