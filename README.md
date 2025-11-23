## Demo ErrorAnalysisAgent

Repo minh họa cách sử dụng `Agent` và hệ thống `tools` của gói `@openai/agents`.

- Logic chính nằm trong `src/index.ts`: khởi tạo `Agent` tên `ErrorAnalysisAgent`, khai báo hướng dẫn tiếng Việt, và cấu hình một tool `get_error_detail`.
- Tool `get_error_detail` mô phỏng việc tra cứu mã lỗi (tham số `error_code`) và trả về mô tả sau 1 giây, giúp bạn thấy cách agent gọi tool để bổ sung dữ liệu trước khi trả lời người dùng.
- `Runner` được cấu hình với `OpenAIProvider` và chạy thử bằng một yêu cầu gồm văn bản + hình ảnh để minh họa khả năng xử lý đa phương thức.

### Chạy thử

```bash
pnpm install
pnpm ts-node src/index.ts
```

Nhớ tạo file `.env` (tham khảo `env.sample`) với `OPENAI_API_KEY` và `ERROR_ANALYSIS_MODEL` trước khi chạy.

