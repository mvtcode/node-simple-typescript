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

// export function calculateCosineSimilarity(vectorA: number[], vectorB: number[]): number {
//   if (vectorA.length !== vectorB.length) {
//     return 0;
//   }

//   let dotProduct = 0;
//   let normA = 0;
//   let normB = 0;

//   for (let i = 0; i < vectorA.length; i++) {
//     dotProduct += vectorA[i] * vectorB[i];
//     normA += vectorA[i] * vectorA[i];
//     normB += vectorB[i] * vectorB[i];
//   }

//   if (normA === 0 || normB === 0) {
//     return 0;
//   }

//   return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
// }
