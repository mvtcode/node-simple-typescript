# RAG using Mongodb Cloud

## Tổng quan
- Dự án RAG (Retrieval-Augmented Generation) sử dụng OpenAI và Node.js
- Chunk file docx và lưu vector embeddings vào MongoDB Atlas (Cloud)
- Sử dụng MongoDB Vector Search để tìm kiếm semantic similarity
- Sinh câu trả lời dựa trên context từ các chunk tương tự nhất

### Kiến trúc

1. **Import dữ liệu** (`src/import.ts`): 
   - Chia nhỏ tài liệu (docx) thành các chunk với overlap
   - Tạo embedding vector cho mỗi chunk bằng OpenAI API
   - Lưu vào MongoDB Atlas với vector index

2. **Tìm kiếm tương tự** (`src/chat.ts`):
   - Tạo embedding cho câu hỏi người dùng
   - Sử dụng MongoDB Vector Search (`$vectorSearch`) để tìm các chunk tương tự nhất
   - MongoDB tự động tính toán cosine similarity

3. **Sinh câu trả lời**:
   - Sử dụng context từ các chunk tương tự nhất
   - Gửi context + câu hỏi đến OpenAI để sinh câu trả lời chính xác

### Cài đặt và cấu hình

#### 1. Cài đặt dependencies

```bash
npm install
```

#### 2. Setup MongoDB Atlas (Cloud)

Tham khảo tài liệu [Tích hợp cloud mongodb cho RAG](https://docs.google.com/document/d/1Lf9Yk9nMobIEV46WBddMpkt_wOQz5xTVg5MSCEfY6T4/edit?usp=sharing) (đồng tác giả) để setup trên Mongodb Cloud

##### Bước 1: Tạo MongoDB Atlas Cluster

1. Truy cập [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Đăng ký/Đăng nhập tài khoản
3. Tạo một **Free Cluster** (M0)
4. Chọn cloud provider và region gần bạn nhất
5. Đặt tên cluster (ví dụ: `Cluster0`)

##### Bước 2: Tạo Database User

1. Vào **Database Access** → **Add New Database User**
2. Chọn **Password** authentication
3. Tạo username và password (lưu lại để dùng trong connection string)
4. Chọn quyền **Atlas admin** hoặc **Read and write to any database**
5. Click **Add User**

##### Bước 3: Cấu hình Network Access

1. Vào **Network Access** → **Add IP Address**
2. Click **Allow Access from Anywhere** (0.0.0.0/0) hoặc thêm IP cụ thể
3. Click **Confirm**

##### Bước 4: Lấy Connection String

1. Vào **Database** → Click **Connect** trên cluster của bạn
2. Chọn **Connect your application**
3. Chọn driver: **Node.js**, version: **5.5 or later**
4. Copy connection string, có dạng:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

##### Bước 5: Tạo Vector Search Index

1. Vào **Database** → Click **Browse Collections**
2. Tạo database mới (ví dụ: `ai-study`) và collection `rag`
3. Vào **Search** tab → **Create Search Index**
4. Chọn **JSON Editor** → Click **Next**
5. Dán JSON config sau:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1536,
      "similarity": "cosine"
    }
  ]
}
```

**Lưu ý**: 
- `numDimensions: 1536` là kích thước vector của model `text-embedding-3-small`
- Nếu dùng model khác, cần thay đổi số dimensions tương ứng
- `similarity: "cosine"` sử dụng cosine similarity

6. Đặt tên index: `vector_index` (phải khớp với tên trong code)
7. Click **Create Search Index**
8. Đợi index được build (có thể mất vài phút)

#### 3. Cấu hình Environment Variables

Tạo file `.env` từ `env.sample` và cấu hình:

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-proj-...
OPENAI_EMBED_MODEL=text-embedding-3-small
OPENAI_RAG_MODEL=gpt-4.1-mini

# MongoDB Atlas Connection String
# Thay <username>, <password>, <cluster> và <database> bằng giá trị thực tế
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/ai-study?retryWrites=true&w=majority
```

**Lưu ý quan trọng**:
- Thay `<username>` và `<password>` bằng database user đã tạo ở Bước 2
- Thay `cluster0.xxxxx` bằng cluster name thực tế
- Thay `ai-study` bằng tên database bạn đã tạo
- URL encode password nếu có ký tự đặc biệt (ví dụ: `@` → `%40`)

### Sử dụng

#### 1. Import tài liệu vào database

Chạy script import để xử lý file docx và lưu vector embeddings vào MongoDB Atlas:

```bash
npm run dev:import
```

**Quy trình hoạt động** (`src/import.ts`):

1. Kết nối MongoDB Atlas
2. Đọc file docx từ thư mục `docs/`
3. Extract text từ file docx
4. Chia nhỏ text thành các chunk (250 từ/chunk, overlap 50 từ)
5. Tạo embedding vector cho mỗi chunk bằng OpenAI API
6. Lưu tất cả chunks vào MongoDB với vector embeddings

**Code chi tiết**:

```1:37:src/import.ts
import './utils/config.util';
import path from 'path';
import { extractTextFromDocx } from './utils/file.util';
import { chunkText } from './utils/chunk.util';
import { getEmbedding } from './services/openai.service';
import mongoose from 'mongoose';
import { insertChunks } from './services/chunk.service';
import { IChunk } from './interfaces/chunk.interface';

(async () => {
  mongoose.set('debug', true);
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

  const chunkDocs: IChunk[] = [];
  for (const content of chunks) {
    const emb = await getEmbedding(content); // sequential; you can batch if needed
    chunkDocs.push({
      content,
      embedding: emb,
    });
  }
  await insertChunks(chunkDocs);
  console.log('Import done!');
  process.exit(0);
})();
```

**Lưu ý**: 
- Quá trình tạo embedding là tuần tự (sequential). Có thể tối ưu bằng cách batch requests nếu có nhiều chunks
- Mỗi chunk được lưu với field `content` (text) và `embedding` (vector 1536 dimensions)

#### 2. Chat với RAG

Chạy script chat để đặt câu hỏi và nhận câu trả lời dựa trên context từ vector search:

```bash
npm run dev:chat
```

**Quy trình hoạt động** (`src/chat.ts`):

1. Kết nối MongoDB Atlas
2. Tạo embedding cho câu hỏi người dùng
3. Sử dụng MongoDB Vector Search để tìm top N chunks tương tự nhất
4. Kết hợp các chunks thành context
5. Gửi context + câu hỏi đến OpenAI để sinh câu trả lời

**Code chi tiết**:

```1:35:src/chat.ts
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
```

**Giải thích Vector Search**:

- `findSimilarChunks()` sử dụng MongoDB aggregation pipeline với `$vectorSearch`
- MongoDB tự động tính toán cosine similarity giữa query vector và các vectors trong database
- Trả về top N chunks có similarity score cao nhất
- Score càng cao (gần 1) thì chunk càng liên quan đến câu hỏi

### Các thành phần chính

#### Core Files

- **`src/import.ts`**: Script chính để import và chunk tài liệu, tạo embeddings, lưu vào MongoDB
- **`src/chat.ts`**: Script chính để test RAG - tìm kiếm semantic và sinh câu trả lời

#### Utilities

- **`src/utils/chunk.util.ts`**: 
  - Hàm `chunkText()`: Chia nhỏ text thành các chunk với overlap
  - Mặc định: 250 từ/chunk, overlap 50 từ để đảm bảo context continuity

- **`src/utils/file.util.ts`**: 
  - Hàm `extractTextFromDocx()`: Đọc và extract text từ file docx sử dụng thư viện `mammoth`

- **`src/utils/config.util.ts`**: 
  - Load environment variables từ file `.env`

#### Services

- **`src/services/openai.service.ts`**: 
  - `getEmbedding()`: Tạo embedding vector từ text sử dụng OpenAI embedding model
  - `answerWithContext()`: Sinh câu trả lời dựa trên context và câu hỏi sử dụng OpenAI chat model

- **`src/services/chunk.service.ts`**: 
  - `insertChunks()`: Lưu nhiều chunks vào MongoDB
  - `findSimilarChunks()`: Tìm kiếm chunks tương tự sử dụng MongoDB Vector Search (`$vectorSearch`)
  - Sử dụng cosine similarity được tính toán tự động bởi MongoDB

#### Models & Interfaces

- **`src/models/chunk.model.ts`**: 
  - Mongoose schema cho chunk document
  - Collection: `rag`
  - Fields: `content` (String), `embedding` (Array of Numbers)
  - Tự động thêm `createdAt` và `updatedAt` (timestamps)

- **`src/interfaces/chunk.interface.ts`**: 
  - TypeScript interface định nghĩa structure của chunk

### Dependencies chính

- **`openai`**: OpenAI API client - tạo embeddings và chat completions
- **`mongoose`**: MongoDB ODM - kết nối và thao tác với MongoDB Atlas
- **`mammoth`**: Đọc và extract text từ file .docx
- **`dotenv`**: Load environment variables từ file `.env`

### MongoDB Vector Search

Dự án sử dụng **MongoDB Atlas Vector Search** để tìm kiếm semantic similarity:

- **Index name**: `vector_index` (phải khớp với tên trong code)
- **Vector field**: `embedding` (array of numbers)
- **Dimensions**: 1536 (cho model `text-embedding-3-small`)
- **Similarity metric**: Cosine similarity
- **Search method**: `$vectorSearch` aggregation pipeline

**Ưu điểm của MongoDB Vector Search**:
- Tìm kiếm nhanh và chính xác với vector index
- Không cần tính toán cosine similarity ở application layer
- Tích hợp sẵn với MongoDB Atlas
- Hỗ trợ filtering kết hợp với vector search

### Troubleshooting

#### Vector Search không hoạt động

1. **Kiểm tra index đã được tạo chưa**:
   - Vào MongoDB Atlas → Database → Search tab
   - Đảm bảo index `vector_index` đã được build thành công (status: Active)

2. **Kiểm tra số dimensions**:
   - Model `text-embedding-3-small` có 1536 dimensions
   - Nếu dùng model khác, cần cập nhật index config

3. **Kiểm tra connection string**:
   - Đảm bảo đã thay `<username>`, `<password>`, và database name
   - URL encode password nếu có ký tự đặc biệt

#### Lỗi kết nối MongoDB

1. **Network Access**: Đảm bảo IP của bạn đã được whitelist trong Network Access
2. **Database User**: Kiểm tra username/password đúng
3. **Connection String**: Format đúng `mongodb+srv://...`

## Tác giả
- tanmv — <macvantan@gmail.com>
