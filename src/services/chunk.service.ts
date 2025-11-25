import { ChunkModel, IChunkDocument } from '../models/chunk.model';
import { calculateCosineSimilarity } from '../utils/chunk.util';

export const insertChunk = ({
  docId,
  text,
  embedding,
}: {
  docId: string;
  text: string;
  embedding: number[];
}) => {
  return ChunkModel.insertOne({
    docId,
    text,
    embedding,
    createdAt: new Date(),
  });
};

export const findSimilarChunks = async (
  queryEmbedding: number[],
  limit: number = 3
): Promise<
  Array<{
    chunk: IChunkDocument;
    similarity: number;
  }>
> => {
  // get all chunks
  const chunks = await ChunkModel.find({
    embedding: { $exists: true, $ne: [] },
  }).exec();

  // Calculate cosine similarity
  const similarities = chunks.map((chunk) => ({
    chunk,
    similarity: calculateCosineSimilarity(queryEmbedding, chunk.embedding),
  }));

  // Sort by similarity
  const sortedSimilarities = similarities.sort((a, b) => b.similarity - a.similarity);

  return sortedSimilarities.slice(0, limit);
};
