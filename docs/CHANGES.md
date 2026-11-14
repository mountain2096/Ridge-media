# Thay đổi theo lộ trình audit

## Giai đoạn 0: bảo mật cấu hình

- `.env` đã được đưa vào `.gitignore`; không tìm thấy `.env` đang tồn tại hoặc được theo dõi trong lịch sử Git hiện có.
- Thêm `.env.example` chỉ chứa tên biến cần cấu hình.
- `docs/AUDIT.md` là nội dung có sẵn trong workspace, chưa được theo dõi bởi Git trước khi bắt đầu nhánh.
- Các thay đổi controller và việc xóa `node_modules.zip` đã tồn tại trước khi bắt đầu; được giữ lại để tiếp tục công việc.
