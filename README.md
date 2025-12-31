# DOCX to Markdown Converter for RAG

## Tổng quan

Công cụ chuyển đổi file DOCX sang Markdown được tối ưu hóa cho hệ thống **RAG (Retrieval-Augmented Generation)**, đảm bảo **không mất thông tin** từ hình ảnh trong tài liệu.

### Vấn đề giải quyết

Khi xây dựng hệ thống RAG, việc chuyển đổi tài liệu DOCX thông thường thường gặp các vấn đề:
- ❌ Hình ảnh bị mất hoàn toàn
- ❌ Văn bản trong ảnh (OCR) không được trích xuất
- ❌ Ngữ cảnh của hình ảnh không được ghi nhận
- ❌ Thông tin quan trọng từ sơ đồ, bảng biểu, UI screenshot bị bỏ qua

### Giải pháp

✅ **Upload hình ảnh lên Cloudflare R2** - Lưu trữ bền vững và truy cập nhanh  
✅ **OCR thông minh với GPT-4 Vision** - Trích xuất văn bản chính xác từ ảnh  
✅ **Phân tích ngữ cảnh** - Hiểu ý nghĩa của ảnh dựa trên nội dung xung quanh  
✅ **Chuyển đổi bảng biểu** - Tự động convert bảng trong ảnh sang Markdown Table  
✅ **Metadata phong phú** - Mô tả chi tiết, loại ảnh, giá trị RAG của từng hình ảnh

## Tính năng chính

### 1. Phân tích DOCX thông minh
- Sử dụng `mammoth` để parse DOCX với độ chính xác cao
- Giữ nguyên thứ tự nội dung (text + images)
- Xử lý UUID placeholder để đảm bảo vị trí chính xác của ảnh

### 2. Xử lý hình ảnh đa chiều

**Upload & Storage:**
- Upload tự động lên Cloudflare R2
- URL công khai, truy cập nhanh
- Tổ chức theo `docId` để dễ quản lý

**AI Analysis (GPT-4 Vision):**
- **OCR**: Trích xuất toàn bộ văn bản trong ảnh
- **Visual Description**: Mô tả chi tiết nội dung hình ảnh
- **Structured Data**: Chuyển đổi bảng/biểu đồ sang Markdown Table
- **Context Summary**: Phân tích giá trị RAG của ảnh

**Context-Aware:**
- Tích hợp heading hiện tại
- Nội dung text trước và sau ảnh
- Giúp LLM hiểu chính xác ngữ cảnh của ảnh

### 3. Output Markdown tối ưu cho RAG

Mỗi hình ảnh được format như sau:

```markdown
![Hình ảnh](https://r2-url/image.png)

**Mô tả hình ảnh:**
[Mô tả chi tiết từ GPT-4 Vision]

**Dữ liệu bảng từ ảnh:**
| Column 1 | Column 2 |
|----------|----------|
| Data 1   | Data 2   |

**Giá trị RAG:**
[Phân tích ý nghĩa của ảnh trong ngữ cảnh tài liệu]

**Văn bản trong ảnh (OCR):**
- Text line 1
- Text line 2
```

## Cài đặt

### 1. Clone repository

```bash
git clone https://github.com/mvtcode/node-simple-typescript.git
git checkout docx2text
cd node-simple-typescript
```

### 2. Cài đặt dependencies

```bash
npm ci
```

### 3. Cấu hình môi trường

Tạo file `.env` với các biến sau:

```env
# OpenAI API
OPENAI_API_KEY=sk-xxx
OPENAI_IMAGE_ANALYTICS_MODEL=gpt-4o

# Cloudflare R2
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=your-bucket-name
R2_PUBLIC_DOMAIN=https://your-domain.com
```

## Sử dụng

### 1. Đặt file DOCX vào thư mục `docs/`

```bash
docs/
  └── your-document.docx
```

### 2. Cập nhật đường dẫn trong `src/index.ts`

```typescript
const inputPath = join(__dirname, '../docs/your-document.docx');
```

### 3. Chạy chương trình

```bash
npm run dev
```

### 4. Kết quả

File Markdown được lưu tại `output/output-{timestamp}.md`

## Kiến trúc hệ thống

```
┌─────────────┐
│  DOCX File  │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│  Mammoth Parser                 │
│  - Extract text blocks          │
│  - Extract images with UUID     │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  Content Blocks (Ordered)       │
│  [text, image, text, image...]  │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  Process Each Block             │
│  ┌─────────────────────────┐   │
│  │ Text Block              │   │
│  │ → Turndown → Markdown   │   │
│  └─────────────────────────┘   │
│  ┌─────────────────────────┐   │
│  │ Image Block             │   │
│  │ 1. Upload to R2         │   │
│  │ 2. Get context          │   │
│  │ 3. GPT-4 Vision analyze │   │
│  │ 4. Format to Markdown   │   │
│  └─────────────────────────┘   │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  Final Markdown File            │
│  - Text content                 │
│  - Image URLs                   │
│  - OCR text                     │
│  - Descriptions                 │
│  - Structured data              │
└─────────────────────────────────┘
```

## Công nghệ sử dụng

- **TypeScript** - Type-safe development
- **Mammoth** - DOCX parsing
- **Turndown** - HTML to Markdown conversion
- **OpenAI GPT-4 Vision** - Image analysis & OCR
- **Cloudflare R2** - Image storage
- **AWS SDK S3** - R2 client

## Cấu trúc thư mục

```
.
├── src/
│   ├── index.ts              # Main conversion logic
│   ├── types.ts              # TypeScript types
│   └── utils/
│       ├── image-processor.ts # GPT-4 Vision integration
│       └── r2-upload.ts       # Cloudflare R2 upload
├── docs/                     # Input DOCX files
├── output/                   # Output Markdown files
├── .env                      # Environment variables
└── package.json
```

## Ví dụ kết quả

Xem file mẫu: `output/output-1767165971988.md`

File này chứa ví dụ thực tế về việc chuyển đổi tài liệu "Tích hợp cloud mongodb cho RAG" với:
- ✅ Hình ảnh UI screenshots được upload lên R2
- ✅ OCR chính xác từ các bảng giá, cấu hình
- ✅ Mô tả chi tiết các giao diện MongoDB Cloud
- ✅ Bảng biểu được convert sang Markdown Table
- ✅ Ngữ cảnh RAG cho mỗi hình ảnh

## Lưu ý quan trọng

### Chi phí API
- GPT-4 Vision: ~$0.01 - $0.03 per image (tùy độ phức tạp)
- Cloudflare R2: Free tier 10GB storage

### Hiệu suất
- Xử lý tuần tự từng ảnh để tránh rate limit
- Thời gian: ~2-5 giây/ảnh tùy kích thước

### Tối ưu cho RAG
- Metadata phong phú giúp vector search chính xác hơn
- OCR text có thể được embedding riêng
- Context summary giúp LLM hiểu mục đích của ảnh

## Roadmap

- [ ] Hỗ trợ batch processing nhiều file
- [ ] Caching kết quả phân tích ảnh
- [ ] Hỗ trợ PDF input
- [ ] Web UI để upload và convert
- [ ] Tích hợp trực tiếp với vector databases

## Tác giả

- tanmv — <macvantan@gmail.com>

## License

ISC
