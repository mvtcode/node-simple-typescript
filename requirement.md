# DOCX → Markdown (.md) với Image cho RAG

## Mục tiêu

Chuyển **file DOCX (text + image)** thành **1 file Markdown (`.md`)**
sao cho:

- Giữ đúng **thứ tự nội dung**
- Ảnh được:
    - Upload lên **Cloudflare R2**
    - Có **public URL**
    - Được **OCR**
    - Được **LLM (gpt-5-mini) mô tả theo ngữ cảnh**
- Output là **Markdown thuần**
- Dùng trực tiếp cho **chunking, embedding và RAG**
- Khi RAG trả lời có thể **hiển thị ảnh minh hoạ thực tế**

------------------------------------------------------------------------

## Tư duy cốt lõi

> LLM **không đọc được DOCX** và **embedding không hiểu ảnh**\
> → Bắt buộc phải **text-hoá ảnh** trước khi đưa vào RAG

Ảnh trong DOCX được chuyển thành:

- URL ảnh thật (Cloudflare R2)
- Mô tả ngữ nghĩa (Vision LLM)
- Văn bản trong ảnh (OCR)

------------------------------------------------------------------------

## Workflow tổng thể

    DOCX
     ↓
    [Mammoth]
     ↓
    Block stream (text | image, giữ thứ tự)
     ↓
    Nếu gặp IMAGE:
       ├─ Upload image → Cloudflare R2 → public URL
       ├─ OCR image (Tesseract / Paddle)
       ├─ GPT-5-mini Vision
           + text ngữ cảnh trước / sau ảnh
     ↓
    Gộp vào Markdown
     ↓
    OUTPUT: file .md

------------------------------------------------------------------------

## Vai trò từng thành phần

### 1. Mammoth (NodeJS)

- Parse DOCX thành text + image
- Giữ nguyên **thứ tự xuất hiện**
- Không dùng LLM

### 2. Cloudflare R2

- Lưu ảnh gốc
- Sinh public URL
- Dùng cho:
    - Vision LLM
    - UI hiển thị ảnh khi RAG trả lời

### 3. OCR (tool)

- Sử dụng LLM
- Trích chữ trong ảnh
- Phục vụ keyword search và recall

### 4. GPT-5-mini (Vision)

- Hiểu ý nghĩa ảnh theo **ngữ cảnh tài liệu**
- Sinh mô tả kỹ thuật, ngắn gọn, dùng cho RAG

------------------------------------------------------------------------

## Cấu trúc Markdown output (chuẩn)

``` md
## Bước 1: Truy cập hệ thống

![Đăng nhập hệ thống](https://cdn.example.com/docs/abc/images/01.png)

**Mô tả hình ảnh:**  
Ảnh minh họa màn hình đăng nhập hệ thống.  
Người dùng nhập email và mật khẩu, sau đó nhấn **Đăng nhập**.

**Văn bản trong ảnh (OCR):**
- Email
- Mật khẩu
- Đăng nhập

## Bước 2: Nhấn nút đăng nhập
```

### Vì sao format này tốt?

- Embedding hiểu được nội dung ảnh
- Dễ chunk theo heading
- UI render được ảnh
- LLM có thể trích dẫn ảnh khi trả lời

------------------------------------------------------------------------

## Logic function tổng quát

    parseDocxToMarkdown(docx):
      parse DOCX bằng mammoth
      for mỗi block:
        nếu text → ghi ra Markdown
        nếu image:
          upload R2 → lấy URL
          OCR image
          Vision GPT (có context)
          ghi Markdown (image + mô tả + OCR)
      return file .md

------------------------------------------------------------------------

## Nguyên tắc bắt buộc

- Ảnh **không bao giờ đứng riêng**
- Ảnh luôn gắn với text liên quan
- Không embed binary ảnh
- Không OCR bằng LLM
- Chunk & embedding thực hiện **sau bước này**

------------------------------------------------------------------------

## Kết luận

> Đây là pipeline **DOCX → Multimodal Markdown Normalizer**\
> dùng cho **RAG có ảnh minh hoạ**, với:
>
> - Mammoth (parse)
> - Cloudflare R2 (image store)
> - OCR (text trong ảnh)
> - GPT-5-mini (hiểu ảnh)
> - Output: **1 file Markdown (.md)** sẵn sàng cho RAG
