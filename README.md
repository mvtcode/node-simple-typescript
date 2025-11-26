# RAG with redis-stack

## Tổng quan
- Dự án RAG (Retrieval-Augmented Generation) sử dụng openai và redis-stack làm vector database.
- Chunk file docx và lưu vào Redis
- Retrieval dữ liệu từ Redis

### Kiến trúc

1. **Import dữ liệu**: Chia nhỏ tài liệu (docx) thành các chunk, tạo embedding vector và lưu vào Redis Stack (RediSearch vector index).
2. **Tìm kiếm tương tự**: Khi có câu hỏi, tạo embedding cho câu hỏi và truy vấn HNSW KNN trên Redis để lấy các chunk gần nhất.
3. **Sinh câu trả lời**: Sử dụng context từ các chunk tương tự để sinh câu trả lời chính xác.

### Cài đặt và cấu hình

1. Cài đặt dependencies:
```bash
npm install
```

2. Chuẩn bị môi trường:
   - Cài redis-stack (hoặc dùng container `redis/redis-stack`), bật module RediSearch.
   - Khởi động redis-stack (kèm UI RedisInsight):
     ```bash
     docker run -d \
       --name redis-stack \
       -p 6379:6379 \
       -p 8001:8001 \
       redis/redis-stack:latest
     ```
     - Truy cập RedisInsight tại `http://localhost:8001`
   - Nếu chỉ cần Redis server (không UI), dùng image `redis/redis-stack-server`:
     ```bash
     docker run -d \
       --name redis-stack-server \
       -p 6379:6379 \
       redis/redis-stack-server:latest
     ```
   - Tạo file `.env` dựa trên `env.sample`, thiết lập `OPENAI_API_KEY`, `OPENAI_EMBED_MODEL`, `OPENAI_RAG_MODEL` (tùy chọn) và `REDIS_URI` (mặc định `redis://localhost:6379`).

3. Import dữ liệu vào Redis:
```bash
npm run dev:import
```
- Script đọc file `docs/huong_dan_may_tinh_windows_co_ban.docx`, chunk theo `250` từ (overlap `50`), sinh embedding qua OpenAI, lưu từng chunk vào Redis với key `doc:<docId>:<chunkIndex>` và index `rag_index`.

4. Khởi chạy chat demo:
```bash
npm run dev:chat
```
- Ứng dụng tạo embedding cho câu hỏi, chạy truy vấn `FT.SEARCH` KNN tới Redis, ghép context từ các chunk gần nhất rồi gọi OpenAI tạo câu trả lời.

## Tác giả
- tanmv — <macvantan@gmail.com>
