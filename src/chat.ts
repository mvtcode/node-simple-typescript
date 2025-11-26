import './utils/config.util';
import { answerWithContext, getEmbedding } from './services/openai.service';
import { RedisClient, VectorSearchResult } from './services/redis.service';

(async () => {
  const redisClient = RedisClient.getInstance();
  await redisClient.connect();

  const question = 'Khởi động máy tính như thế nào?';
  console.log('User:', question);

  const questionEmbedding = await getEmbedding(question);
  const topChunks = await redisClient.searchKNN(questionEmbedding, 3);

  const context = topChunks
    .map(
      (chunk: VectorSearchResult, i: number) =>
        `Chunk ${i + 1} (doc: ${chunk.docId}, distance: ${chunk.distance.toFixed(4)}):\n${chunk.content}`
    )
    .join('\n\n---\n\n');

  const answer = await answerWithContext(question, context);

  console.log('AI:', answer);
  process.exit(0);

  /*
  User: Khởi động máy tính như thế nào?
  AI: Để khởi động máy tính Windows, bạn làm theo các bước sau:

  - Nhấn nút nguồn để mở máy.
  - Khi màn hình đăng nhập (login) xuất hiện, nhập mật khẩu hoặc PIN (nếu có).
  - Nếu thiết bị hỗ trợ Windows Hello, bạn cũng có thể đăng nhập bằng vân tay hoặc nhận diện khuôn mặt.
  */
})();
