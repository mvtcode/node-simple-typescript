# File Upload Application — Implementation Plan

## Tổng quan

Xây dựng ứng dụng **upload file đơn** bằng Node.js + TypeScript + Express + Busboy.

Đặc điểm chính:
- Detect user **abort** giữa chừng → **xóa ngay** file `.tmp`
- Upload thành công → rename sang `PUBLIC_PATH` với tên `originalname.datetime-random.ext`
- Serve static file qua `APP_BASE_PATH`
- Endpoint **public**, không cần auth
- Không giới hạn file size
- Response JSON chuẩn

---

## Cấu trúc thư mục

```
node-simple-typescript/
├── src/
│   ├── index.ts              # Entry point: bootstrap app
│   ├── config.ts             # Đọc & validate .env
│   ├── utils/
│   │   └── filename.ts       # Sinh tên file: datetime + random string
│   ├── middlewares/
│   │   └── upload.ts         # Busboy upload handler (core logic)
│   └── routes/
│       └── upload.route.ts   # Express router định nghĩa routes
├── public/                   # Default PUBLIC_PATH (gitignored)
├── env.sample                # Template .env
├── .env                      # Thực tế (gitignored)
└── plan.md
```

---

## Chi tiết từng file

### 1. `env.sample` & `.env`

```env
APP_PORT=3000
APP_BASE_PATH=/api/upload
PUBLIC_PATH=public
```

> `PUBLIC_PATH` có thể là relative (e.g. `public`) hoặc absolute (e.g. `/home/user/uploads`).

---

### 2. `src/config.ts`

Đọc và validate các biến môi trường. Export object `config` dùng toàn app:

```ts
export const config = {
  port: number,           // APP_PORT (default: 3000)
  basePath: string,       // APP_BASE_PATH (default: /api/upload)
  publicPath: string,     // resolved absolute path từ PUBLIC_PATH
}
```

---

### 3. `src/utils/filename.ts`

Sinh tên file dạng: `originalname.YYYYMMDD-HHmmss-XXXXXX.ext`

- **Format**: `{stem}.{YYYYMMDD}-{HHmmss}-{randomHex6}.{ext}`
- **Ví dụ**: `photo.20260826-061900-a3f9c1.jpg`
- Dễ sort theo thời gian, dễ nhìn bằng mắt
- Sanitize `stem` & `ext` (loại bỏ ký tự đặc biệt, path traversal)

```ts
export function generateFilename(originalName: string): string
```

---

### 4. `src/middlewares/upload.ts`

**Core logic** — xử lý toàn bộ luồng upload qua Busboy:

#### Luồng upload thành công:
```
req (stream) → Busboy parse → write stream → tmpFile
                                                  ↓
                                         rename → finalFile (PUBLIC_PATH)
                                                  ↓
                                         return JSON response
```

#### Luồng upload bị abort:
```
req.on('close') fired trước khi busboy finish
  → set aborted = true
  → đóng write stream
  → fs.unlink(tmpFile)   ← xóa ngay
  → không send response (connection đã đóng)
```

#### Chi tiết implementation:
- Dùng `busboy` để parse `multipart/form-data`
- Chỉ xử lý field `file` (1 file duy nhất)
- Ghi stream vào `{finalName}.tmp` trong `PUBLIC_PATH`
- Lắng nghe `req.on('close')` để detect abort
- Phân biệt abort vs finish: dùng flag `finished` và `aborted`
- Khi finish → `fs.rename(tmpFile, finalFile)`
- Trả về JSON đầy đủ theo spec

#### Response khi thành công:
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
    "filename": "photo.20260826-061900-a3f9c1.jpg",
    "path": "/abs/path/to/public/photo.20260826-061900-a3f9c1.jpg",
    "size": 123456,
    "publishUrl": "/api/upload/photo.20260826-061900-a3f9c1.jpg"
  }
}
```

#### Response khi lỗi:
```json
{
  "status": "error",
  "message": "No file field found in request"
}
```

---

### 5. `src/routes/upload.route.ts`

```ts
router.post('/', uploadMiddleware)   // POST /api/upload  → upload file
router.use('/', express.static(...)) // GET  /api/upload/filename → serve file
```

---

### 6. `src/index.ts`

- Load dotenv
- Tạo Express app
- Tạo folder `PUBLIC_PATH` nếu chưa tồn tại
- Mount router tại `APP_BASE_PATH`
- Listen tại `APP_PORT`

---

## Dependencies cần cài

| Package | Type | Mục đích |
|---|---|---|
| `express` | production | Web framework |
| `busboy` | production | Multipart parser, detect abort |
| `@types/express` | dev | TypeScript types |
| `@types/busboy` | dev | TypeScript types |

> **Không cần** `uuid` vì dùng datetime + random string thay thế.

```bash
npm install express busboy
npm install -D @types/express @types/busboy
```

---

## Xử lý edge cases

| Tình huống | Xử lý |
|---|---|
| Request không có field `file` | Return 400 + error JSON |
| Content-Type không phải `multipart/form-data` | Return 400 + error JSON |
| Abort xảy ra trước khi busboy start | `req.on('close')` vẫn fire, cleanup nếu tmp tồn tại |
| Abort xảy ra sau khi rename xong | Không thể xóa (đã là final file), chấp nhận |
| `PUBLIC_PATH` không tồn tại | Auto-create khi khởi động app |
| Tên file trùng (cực hiếm) | Coi như không xảy ra (datetime + random đủ entropy) |

---

## Thứ tự implement

- [x] Cài dependencies (`express`, `busboy`, types)
- [x] Cập nhật `env.sample` với các biến mới
- [x] Tạo `src/config.ts`
- [x] Tạo `src/utils/filename.ts`
- [x] Tạo `src/middlewares/upload.ts`
- [x] Tạo `src/routes/upload.route.ts`
- [x] Cập nhật `src/index.ts` (bootstrap app)
- [x] Test thủ công & automated: upload thành công, upload abort
- [x] Cập nhật `README.md`

---

## Verification

### Test upload thành công:
```bash
curl -X POST http://localhost:3000/api/upload \
  -F "file=@/path/to/photo.jpg"
# Expect: 200 + JSON với status: success
```

### Test serve static:
```bash
curl http://localhost:3000/api/upload/photo.20260826-061900-a3f9c1.jpg
# Expect: file content
```

### Test abort:
```bash
# Upload file lớn rồi Ctrl+C giữa chừng
# Expect: file .tmp bị xóa khỏi PUBLIC_PATH
```
