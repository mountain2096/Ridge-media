# Thiết lập đăng nhập Google

1. Mở [Google Cloud Console](https://console.cloud.google.com/) và tạo hoặc chọn một project.
2. Vào **APIs & Services → OAuth consent screen**, chọn **External**, đặt trạng thái **Testing**, rồi thêm email Google của chủ dự án vào **Test users**.
3. Vào **Credentials → Create credentials → OAuth client ID**, chọn **Web application**. Thêm **Authorized JavaScript origins**: `http://localhost:5173`. GIS không cần redirect URI.
4. Sao chép **Client ID** vào `.env` ở thư mục gốc cho cả `GOOGLE_CLIENT_ID` và `VITE_GOOGLE_CLIENT_ID`. Hai giá trị giống nhau; Client ID là công khai, không cần cấu hình client secret.
5. Khởi động lại ứng dụng: `npm.cmd run dev:all`.
6. Nếu gặp `origin_mismatch`, kiểm tra origin có đúng `http://localhost:5173` và không thêm dấu `/` cuối. Nếu nút không xuất hiện, kiểm tra mạng có tải được `https://accounts.google.com/gsi/client` và `VITE_GOOGLE_CLIENT_ID`. Lỗi 503 “chưa cấu hình” nghĩa là API chưa có `GOOGLE_CLIENT_ID`; khởi động lại API sau khi sửa `.env`. Nếu đăng nhập bị từ chối, thêm đúng tài khoản vào **Test users**. Trong chế độ **Testing**, chỉ những tài khoản đã liệt kê mới đăng nhập được.
