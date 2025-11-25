import mammoth from 'mammoth';
import fs from 'fs';

export async function extractTextFromDocx(path: string): Promise<string> {
  const buffer = fs.readFileSync(path);
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}
