Tôi muốn xây dựng một ứng dụng upload file.

Điều kiện khi user upload giữa chừng bị aborted thì file sẽ được lưu lại dạng tmp.
User upload hoàn thành thì sẽ lưu file vào folder đã chỉ định (config upload folder trong .env). Tên file cần random theo uuid v7 và giữ nguyên định dạng file gốc (ví dụ file.jpg -> file.uuid.jpg).

random có thể là uuid v7 hoặc sinh ra từ datetime + random string. Có thể sort hoặc nhìn bằng mắt file nào mới được upload.

Ứng dụng là typescript. chọn module nào phù hợp cho tôi.
Tôi thấy Multer không bắt được event user abort. hãy tìm cách hoặc module thay thế. có thể là Formidable, Busboy.

Khi upload xong, sẽ return về cho FE 1 json gồm các thông tin:

```json
{
  "status": "success",
  "message": "File uploaded successfully",
  "data": {
    "fieldName": "file",
    "originalName": "original name của file",
    "encoding": "8bit",
    "mimeType": "application/octet-stream",
    "destination": "/path đến file",
    "filename": "name của file sau khi upload",
    "path": "path đầy đủ đến file",
    "size": 123456,
    "publishUrl": "url để public file"
  }
}
```

Cấu hình .env

```env
APP_PORT=3000
APP_BASE_PATH=/api/upload
PUBLIC_PATH=public # hoặc /home/tanmv/data/uploads
```

PUBLIC_PATH là public folder của ứng dụng và cũng là nơi để upload file vào đó.
Sau khi upload xong, file được lưu tại folder PUBLIC_PATH, và có path vật lý là PUBLIC_PATH + filename.
Cấu hình express có folder public static tại đường dẫn PUBLIC_PATH.
Dựa vào cấu hình tổng thể, đường dẫn publishUrl sẽ là:

publishUrl = ${APP_BASE_PATH}/${filename}

Ví dụ:
APP_BASE_PATH = /api/upload
APP_PORT = 3000
filename = file.uuid.jpg
publishUrl = /api/upload/file.uuid.jpg

Khi user request đến http://localhost:3000/api/upload/file.uuid.jpg, express sẽ serve file từ folder PUBLIC_PATH tại đường dẫn /api/upload/.
