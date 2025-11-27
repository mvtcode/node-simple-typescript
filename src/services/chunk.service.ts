import { IChunk } from '../interfaces/chunk.interface';
import { ChunkModel } from '../models/chunk.model';

export const insertChunk = (chunk: IChunk) => {
  return ChunkModel.insertOne(chunk);
};

export const insertChunks = (chunks: IChunk[]) => {
  return ChunkModel.insertMany(chunks);
};

export const findSimilarChunks = async (
  queryEmbedding: number[],
  limit: number = 3
): Promise<
  {
    content: string;
    score: number;
  }[]
> => {
  const results = await ChunkModel.aggregate([
    {
      $vectorSearch: {
        index: 'vector_index', // tên index bạn đã tạo
        path: 'embedding', // field vector
        queryVector: queryEmbedding, // vector query
        numCandidates: 100, // càng cao càng chính xác
        limit: limit,
      },
    },
    {
      $project: {
        content: 1,
        score: { $meta: 'vectorSearchScore' },
      },
    },
  ]);

  return results as unknown as {
    content: string;
    score: number;
  }[];
};
