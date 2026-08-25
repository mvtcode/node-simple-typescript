import crypto from 'crypto';
import path from 'path';

function padZero(num: number): string {
  return num.toString().padStart(2, '0');
}

export function formatDateTime(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = padZero(date.getMonth() + 1);
  const day = padZero(date.getDate());
  const hours = padZero(date.getHours());
  const minutes = padZero(date.getMinutes());
  const seconds = padZero(date.getSeconds());
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

export function generateRandomString(length: number = 6): string {
  return crypto
    .randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
}

export function sanitizeFilenameStem(name: string): string {
  // Remove path traversal and illegal filename characters across platforms
  const sanitized = name.replace(/[/\\?%*:|"<>]/g, '_').trim();
  return sanitized || 'file';
}

export function generateFilename(originalName: string, date: Date = new Date()): string {
  const parsed = path.parse(path.basename(originalName || 'file'));
  const stem = sanitizeFilenameStem(parsed.name || 'file');
  const ext = parsed.ext; // includes dot, e.g. '.jpg', or ''
  const dt = formatDateTime(date);
  const randomStr = generateRandomString(6);

  return `${stem}.${dt}-${randomStr}${ext}`;
}
