import './utils/config.util';
import { answerWithContext, getEmbedding } from './services/openai.service';
import mongoose from 'mongoose';
import { findSimilarChunks } from './services/chunk.service';

(async () => {
  mongoose.set('debug', true);
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rag');
  console.log('Connected database');

  const question = 'Khởi động máy tính như thế nào?';
  console.log('User:', question);

  const questionEmbedding = await getEmbedding(question);
  const topChunks = await findSimilarChunks(questionEmbedding, 3);

  const context = topChunks
    .map((c, i) => `Chunk ${i + 1} (score: ${c.similarity.toFixed(3)}):\n${c.chunk.text}`)
    .join('\n\n---\n\n');

  const answer = await answerWithContext(question, context);

  console.log('AI:', answer);
  process.exit(0);

  /*
  User: Khởi động máy tính như thế nào?
  AI: Để khởi động máy tính, bạn cần thực hiện các bước sau:
  1. Nhấn nút nguồn trên máy tính để bắt đầu quá trình khởi động.
  2. Khi màn hình login xuất hiện, nhập mật khẩu hoặc PIN (nếu có).
  3. Bạn cũng có thể sử dụng vân tay hoặc nhận diện khuôn mặt trên thiết bị hỗ trợ Windows Hello để đăng nhập vào máy tính.
  */
})();
