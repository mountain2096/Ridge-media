# Thay đổi theo lộ trình audit

## Giai đoạn 0: bảo mật cấu hình

- `.env` đã được đưa vào `.gitignore`; không tìm thấy `.env` đang tồn tại hoặc được theo dõi trong lịch sử Git hiện có.
- Thêm `.env.example` chỉ chứa tên biến cần cấu hình.
- `docs/AUDIT.md` là nội dung có sẵn trong workspace, chưa được theo dõi bởi Git trước khi bắt đầu nhánh.
- Các thay đổi controller và việc xóa `node_modules.zip` đã tồn tại trước khi bắt đầu; được giữ lại để tiếp tục công việc.

## Giai đoạn 1: model

- Xác minh AUDIT.md đã sai ở thời điểm bắt đầu: User đã có `isLocked` và unique username; Post đã có `privacy`, `status`, `originalPostId`; Comment có `status`; Report đã có model; Notification đã có `share` và `system`.
- Thêm `dateOfBirth` cùng cập nhật hồ sơ có kiểm tra ngày hợp lệ.
- Thêm unique partial index cho lời mời kết bạn đang chờ. Migration kiểm tra dữ liệu trùng trước khi tạo index và dừng an toàn nếu phát hiện trùng, không xóa dữ liệu.
- Có sẵn migration status cho bài viết/bình luận cũ; không chạy migration dữ liệu vì cần nhắm đúng MongoDB người dùng và không có yêu cầu/ủy quyền ghi vào DB thật.
