## Đăng nhập AD (Active Directory) bằng Node + TypeScript

Ứng dụng demo này sử dụng thư viện `ldapts` để tạo kết nối LDAP/LDAPS tới Active Directory và xác thực người dùng (xem `src/index.ts`). Tài liệu dưới đây hướng dẫn đầy đủ từ bước tạo đường hầm (tunnel) tới cấu hình biến môi trường và chạy mã nguồn.

## 1. Chuẩn bị đường hầm LDAP/LDAPS

Sử dụng câu lệnh SSH tương ứng để forward cổng từ máy cục bộ tới máy chạy AD (tham khảo `env.sample`):

```
# LDAP (cổng 389)
ssh -N -L 127.0.0.1:1389:172.16.220.207:389 tanmv@10.0.20.254

# LDAPS (cổng 636)
ssh -N -L 127.0.0.1:1636:172.16.220.207:636 tanmv@10.0.20.254
```

Giữ phiên SSH này mở trong suốt quá trình kiểm thử; tuỳ vào việc bạn dùng LDAP hay LDAPS mà điều chỉnh biến môi trường tương ứng ở bước tiếp theo.

## 2. Tạo file môi trường

1. Sao chép `env.sample` thành `.env`.
2. Cập nhật các biến:
   - `LDAP__SERVER`: `ldap://127.0.0.1` hoặc `ldaps://127.0.0.1`.
   - `LDAP__PORT`: `1389` (LDAP) hoặc `1636` (LDAPS).
   - `LDAP__BASEDN`, `LDAP__UPN_SUFFIX`: chỉnh theo AD thực tế.
3. Không commit file `.env` chứa thông tin nhạy cảm.

## 3. Cài đặt và chạy ứng dụng

```
npm install
npm run dev        # chạy trực tiếp bằng ts-node-dev
# hoặc
npm run build && npm start
```

Trong `src/index.ts`, script đang dùng tài khoản mẫu:

```
const username = 'tanmv';
const password = 'aA123456!1';
```

Nên chuyển sang nhận thông tin từ biến môi trường hoặc tham số dòng lệnh trước khi sử dụng thật. Khi chạy thành công, ứng dụng sẽ:

1. Gọi `client.bind` với định dạng `${username}@${LDAP__UPN_SUFFIX}` để xác thực.
2. Thực hiện `client.search` theo `LDAP__BASEDN` và filter `sAMAccountName`.
3. In ra thông tin người dùng (các thuộc tính ở mảng `attributes`).

Nếu đăng nhập thất bại, lỗi sẽ được log ra console và client luôn được `unbind` trong khối `finally`.

## 4. Ghi chú bảo mật

- Với LDAPS, mã mẫu đặt `rejectUnauthorized: false` để bỏ qua xác thực CA. Chỉ nên dùng ở môi trường thử nghiệm; với môi trường thật hãy cung cấp CA hợp lệ.
- Không hard-code thông tin tài khoản thật trong repository.
