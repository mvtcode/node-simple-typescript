# Node Simple TypeScript - File Upload Service

## Tổng quan
- Ứng dụng upload file đơn viết bằng Node.js + TypeScript + Express + Busboy.
- Tự động bắt sự kiện **client abort** giữa chừng để xóa ngay file tạm `.tmp`.
- Tự động sinh tên file theo định dạng: `originalname.YYYYMMDD-HHmmss-random6.ext` (dễ xem và sort theo thời gian).
- Hỗ trợ serve static file qua `APP_BASE_PATH`.

## Cấu hình môi trường (.env)

Tạo file `.env` từ `env.sample`:

```env
APP_PORT=3000
APP_BASE_PATH=/api/upload
PUBLIC_PATH=public
```

| Biến | Mặc định | Mô tả |
|---|---|---|
| `APP_PORT` | `3000` | Port Express server lắng nghe |
| `APP_BASE_PATH` | `/api/upload` | Base path cho upload và serve static |
| `PUBLIC_PATH` | `public` | Thư mục lưu trữ file upload (hỗ trợ relative hoặc absolute path) |

## Cài đặt & Khởi chạy

```bash
# Cài đặt dependencies
npm install

# Chạy ở chế độ development
npm run dev

# Chạy ở chế độ development có auto-reload (watch)
npm run dev:watch

# Chạy kiểm thử tự động (integration tests)
npm test

# Build production bundle
npm run build

# Chạy bản production đã build
npm start

# Format code & Lint
npm run format
npm run lint:fix
```

## Khởi chạy với Docker

```bash
# 1. Build image
docker build -t node-upload-service .

# 2. Chạy container (mount volume lưu file nếu cần)
docker run -d \
  --name upload-service \
  -p 3000:3000 \
  -v $(pwd)/uploads:/app/public \
  node-upload-service

# 3. Xem logs
docker logs -f upload-service
```

## API Specification

### 1. Health Check
- **Method**: `GET`
- **Path**: `/health`
- **Response**:
```json
{
  "status": "ok",
  "timestamp": "2026-08-26T00:00:00.000Z"
}
```

### 2. Upload File
- **Method**: `POST`
- **Path**: `/api/upload` (theo `APP_BASE_PATH`)
- **Content-Type**: `multipart/form-data`
- **Form Field**: `file` (1 file duy nhất)

#### Ví dụ cURL:
```bash
curl -X POST http://localhost:3000/api/upload \
  -F "file=@photo.jpg"
```

#### Response thành công (200 OK):
```json
{
  "status": "success",
  "message": "File uploaded successfully",
  "data": {
    "fieldName": "file",
    "originalName": "photo.jpg",
    "encoding": "7bit",
    "mimeType": "image/jpeg",
    "destination": "public",
    "filename": "photo.20260826-062800-a3f9c1.jpg",
    "path": "D:\\projects\\node-simple-typescript\\public\\photo.20260826-062800-a3f9c1.jpg",
    "size": 123456,
    "publishUrl": "/api/upload/photo.20260826-062800-a3f9c1.jpg"
  }
}
```

### 3. Truy cập Static File
- **Method**: `GET`
- **Path**: `/api/upload/<filename>`
- **Ví dụ**: `http://localhost:3000/api/upload/photo.20260826-062800-a3f9c1.jpg`

## Xử lý User Abort
Khi client hủy / ngắt kết nối giữa chừng lúc đang upload:
1. Server bắt sự kiện `req.on('close')`.
2. Đóng stream ghi file và tự động xóa file `.tmp` ngay lập tức.
3. Không để lại file rác trong thư mục `PUBLIC_PATH`.

## Tác giả
- tanmv — <macvantan@gmail.com>
