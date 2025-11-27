import './utils/config.util';
import { answerWithContext, getEmbedding } from './services/openai.service';
import mongoose from 'mongoose';
import { findSimilarChunks } from './services/chunk.service';

(async () => {
  mongoose.set('debug', true);
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rag');
  console.log('Connected database');

  const question = 'Khởi động máy tính như thế nào?';

  const questionEmbedding = await getEmbedding(question);
  const topChunks = await findSimilarChunks(questionEmbedding, 3);

  const context = topChunks
    .map((c, i) => `Chunk ${i + 1} (score: ${c.score.toFixed(3)}):\n${c.content}`)
    .join('\n\n---\n\n');

  const answer = await answerWithContext(question, context);

  console.log('User:', question);
  console.log('AI:', answer);
  process.exit(0);

  /*
  User: Khởi động máy tính như thế nào?
  AI: Để khởi động máy tính Windows, bạn làm theo các bước sau:

  - Nhấn nút nguồn để mở máy.
  - Khi màn hình đăng nhập (login) xuất hiện, nhập mật khẩu hoặc PIN (nếu có).
  - Bạn cũng có thể đăng nhập bằng vân tay hoặc nhận diện khuôn mặt nếu thiết bị hỗ trợ Windows Hello.
  */
})();
