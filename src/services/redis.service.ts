import { createClient } from 'redis';

type RedisVectorClient = ReturnType<typeof createClient>;

export type VectorSearchResult = {
  id: string;
  content: string;
  docId: string;
  chunkId: number;
  distance: number;
};

export class RedisClient {
  private static instance: RedisClient;
  private client: RedisVectorClient | null = null;
  private readonly INDEX_NAME = 'rag_index';
  private readonly VECTOR_DIM = 1536; // Embedding dimension
  private readonly KEY_PREFIX = 'doc:';

  private constructor() {
    //
  }

  public static getInstance(): RedisClient {
    if (!this.instance) {
      this.instance = new RedisClient();
    }

    return this.instance;
  }

  public async connect() {
    if (this.client?.isOpen) return this.client;

    this.client = createClient({ url: process.env.REDIS_URI || 'redis://localhost:6379' });
    this.client.on('error', (err) => console.error('Redis error', err));
    await this.client.connect();
    return this.client;
  }

  public async createVectorIndex() {
    const redis = this.getRedisClient();

    try {
      await redis.ft.create(
        this.INDEX_NAME,
        {
          content: { type: 'TEXT' },
          embedding: {
            type: 'VECTOR',
            ALGORITHM: 'HNSW',
            TYPE: 'FLOAT32',
            DIM: this.VECTOR_DIM,
            DISTANCE_METRIC: 'COSINE',
          },
        },
        { ON: 'HASH', PREFIX: this.KEY_PREFIX }
      );
      console.log('Index created!');
    } catch (err: any) {
      if (!err.message.includes('Index already exists')) console.error(err);
    }
  }

  public async addDocument(
    docId: string,
    chunkId: number,
    content: string,
    embedding: Float32Array,
    metadata: Record<string, string | number> = {}
  ) {
    const redis = this.getRedisClient();
    const buffer = Buffer.from(embedding.buffer);
    const key = `${this.KEY_PREFIX}${docId}:${chunkId}`;

    const processedMetadata = Object.entries({
      docId,
      chunkId,
      ...metadata,
    }).reduce<Record<string, string>>((acc, [k, v]) => {
      acc[k] = v.toString();
      return acc;
    }, {});

    await redis.hSet(key, {
      content,
      embedding: buffer,
      ...processedMetadata,
    });
  }

  public async searchKNN(
    queryEmbedding: Float32Array,
    topK = 5,
    filter = ''
  ): Promise<VectorSearchResult[]> {
    const redis = this.getRedisClient();
    const buffer = Buffer.from(queryEmbedding.buffer);
    const query = filter
      ? `${filter}=>[KNN $k @embedding $vec AS score]`
      : `*=>[KNN $k @embedding $vec AS score]`;

    const results = (await redis.ft.search(this.INDEX_NAME, query, {
      PARAMS: { k: topK, vec: buffer },
      SORTBY: 'score',
      DIALECT: 2,
      RETURN: ['content', 'docId', 'chunkId', 'score'],
    })) as { documents: Array<{ id: string; value: Record<string, string> }> };

    return results.documents.map((d) => ({
      id: d.id,
      content: d.value.content ?? '',
      docId: d.value.docId ?? '',
      chunkId: Number(d.value.chunkId ?? 0),
      distance: parseFloat(d.value.score ?? '0'),
    }));
  }

  private getRedisClient(): RedisVectorClient {
    if (!this.client || !this.client.isOpen) {
      throw new Error('Redis client chưa được kết nối. Hãy gọi connect() trước.');
    }

    return this.client;
  }
}
