import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY!,
    secretAccessKey: process.env.R2_SECRET_KEY!,
  },
});

export async function uploadImage(buffer: Buffer, mime: string, docId: string): Promise<string> {
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  const ext = mime.split('/')[1] || 'png';
  const key = `docs/${docId}/images/${hash}.${ext}`;

  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: key,
      Body: buffer,
      ContentType: mime,
    })
  );

  return `${process.env.R2_PUBLIC_DOMAIN}/${key}`;
}
