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

## Giai đoạn 2: middleware

- Xác minh `protect` hiện đã nạp User từ DB và từ chối tài khoản `isLocked`; `requireAdmin` đã kiểm tra `req.user.isAdmin` sau xác thực. Đây là code có sẵn trước thay đổi.
- Bổ sung test hồi quy cho hai nhánh phân quyền này; sẽ gắn `requireAdmin` vào các route quản trị ở giai đoạn 6.

## Giai đoạn 3: xóa mềm bài viết và bình luận

- Các thay đổi controller tương ứng đã có sẵn trong workspace trước khi bắt đầu; rà soát và bổ sung quyền Admin xóa bài viết.
- Bài viết/bình luận được đánh dấu `deleted`, các truy vấn đọc và thao tác chỉ nhắm bản ghi `active`; tác giả bình luận, chủ bài và Admin có quyền xóa bình luận.
- Thêm test cho xóa mềm và quyền chủ bài/Admin.

## Giai đoạn 4: newsfeed

- Lọc bài đang hoạt động theo privacy public/friends/private và quan hệ bạn bè.
- Loại bài của cả người người xem chặn lẫn người đã chặn người xem; truy vấn phân trang mặc định 20, tối đa 50 và trả metadata.
- Thêm test kiểm tra bộ lọc, phân trang và giới hạn page size.
