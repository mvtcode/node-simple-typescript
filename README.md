# RAG with nodejs

## Tổng quan
- Dự án RAG (Retrieval-Augmented Generation) sử dụng openai và nodejs, không sử dụng thư viện ngoài.
- Chunk file docx và lưu vào mongodb
- Retrieval dữ liệu từ mongodb và tính toán cosine ở nodejs

### Kiến trúc

1. **Import dữ liệu**: Chia nhỏ tài liệu (docx) thành các chunk, tạo embedding vector và lưu vào MongoDB
2. **Tìm kiếm tương tự**: Khi có câu hỏi, tạo embedding cho câu hỏi và tìm các chunk tương tự nhất
3. **Sinh câu trả lời**: Sử dụng context từ các chunk tương tự để sinh câu trả lời chính xác

### Cài đặt và cấu hình

1. Cài đặt dependencies:
```bash
npm install
```

2. Tạo file `.env` từ `env.sample` và cấu hình:
```env
OPENAI_API_KEY=sk-proj-...
OPENAI_EMBED_MODEL=text-embedding-3-small
OPENAI_RAG_MODEL=gpt-4.1-mini

MONGODB_URI=mongodb://127.0.0.1:27017/rag
```

3. Đảm bảo MongoDB đang chạy

### Sử dụng

#### 1. Import tài liệu vào database

Chạy script import để xử lý file docx và lưu vào database:

```bash
npm run dev:import
```

Code mẫu từ `src/import.ts`:

```1:47:src/import.ts
import './utils/config.util';
import path from 'path';
import { extractTextFromDocx } from './utils/file.util';
import { chunkText } from './utils/chunk.util';
import { v4 as uuidv4 } from 'uuid';
import { getEmbedding } from './services/openai.service';
import { ChunkModel } from './models/chunk.model';
import mongoose from 'mongoose';

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rag');
  console.log('Connected database');

  console.log('Read file...');
  const docFilePath = path.join(__dirname, '..', 'docs/huong_dan_may_tinh_windows_co_ban.docx');
  const docContent = await extractTextFromDocx(docFilePath);
  console.log('Read file done', docContent.length);

  console.log('Progress chunks...');
  const chunks = chunkText(docContent, 250, 50);
  const chunksLength = chunks.length;
  console.log('Total chunks', chunksLength);

  const now = new Date();
  const docId = uuidv4();
  const chunkDocs = [];
  for (let i = 0; i < chunksLength; i++) {
    const text = chunks[i];
    const emb = await getEmbedding(text); // sequential; you can batch if needed
    chunkDocs.push({
      docId,
      text,
      embedding: emb,
      createdAt: now,
    });
  }
  await ChunkModel.insertMany(chunkDocs);
  console.log('Import done!');
  process.exit(0);
})();
```

#### 2. Chat với RAG

Chạy script chat để đặt câu hỏi và nhận câu trả lời dựa trên context:

```bash
npm run dev:chat
```

Code mẫu từ `src/chat.ts`:

```1:32:src/chat.ts
import './utils/config.util';
import { answerWithContext, getEmbedding } from './services/openai.service';
import mongoose from 'mongoose';
import { findSimilarChunks } from './services/chunk.service';

(async () => {
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
```

### Các thành phần chính

- **`src/utils/chunk.util.ts`**: Chia nhỏ text thành các chunk với overlap
- **`src/utils/file.util.ts`**: Đọc và extract text từ file docx
- **`src/services/openai.service.ts`**: Tạo embedding và sinh câu trả lời với OpenAI API
- **`src/services/chunk.service.ts`**: Tìm kiếm chunk tương tự dựa trên cosine similarity
- **`src/models/chunk.model.ts`**: Mongoose model cho chunk document

### Dependencies chính

- `openai`: OpenAI API client
- `mongoose`: MongoDB ODM
- `mammoth`: Đọc file docx
- `uuid`: Tạo unique ID

## Tác giả
- tanmv — <macvantan@gmail.com>
