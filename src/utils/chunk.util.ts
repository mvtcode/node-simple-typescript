export function chunkText(text: string, maxWords = 250, overlapWords = 50) {
  const words = text.split(/\s+/).filter(Boolean);

  // Nếu file quá ngắn, return 1 chunk luôn
  if (words.length <= maxWords) {
    return [words.join(' ')];
  }

  // Bảo vệ overlap
  if (overlapWords >= maxWords) {
    overlapWords = maxWords - 1;
  }

  const chunks: string[] = [];
  let i = 0;

  while (i < words.length) {
    const end = Math.min(i + maxWords, words.length);
    const chunk = words.slice(i, end).join(' ');
    chunks.push(chunk);

    const next = end - overlapWords;

    // Không bao giờ để pointer lùi hoặc đứng yên
    if (next <= i) {
      i = end; // tiến hẳn về phía trước
    } else {
      i = next;
    }
  }

  return chunks;
}
