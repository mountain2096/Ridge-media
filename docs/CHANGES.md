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

## Giai đoạn 5: chặn nhắn tin

- Chặn tạo hội thoại, gửi tin, đọc lịch sử và đánh dấu đã đọc nếu một trong hai người chặn người kia.
- Lọc hội thoại bị block khỏi danh sách. Kiểm tra blockList từ hai phía, kể cả dữ liệu hội thoại cũ.
- Thêm test cho block từ phía người nhận và người gửi; không tạo tin nhắn khi bị chặn.

## Giai đoạn 6: Report và Admin

- Thêm API gửi báo cáo bài viết/bình luận đang hoạt động; báo cáo trùng trả 409 theo unique index sẵn có.
- Thêm API Admin liệt kê người dùng, khóa/mở khóa tài khoản, xem báo cáo và cập nhật trạng thái. Tất cả `/api/admin` được bảo vệ bằng `protect` và `requireAdmin`.
- Bổ sung `reviewedBy`/`reviewedAt` để lưu người và thời điểm xử lý. Trạng thái `actioned` ghi nhận quyết định Admin nhưng không tự xóa bài hay khóa tài khoản; giữ nguyên nội dung và tài khoản trừ khi Admin dùng thao tác tương ứng.
- Thêm test cho báo cáo trùng, khóa tài khoản và audit thông tin người duyệt.

## Giai đoạn 7: đổi mật khẩu và chia sẻ

- Thêm endpoint đổi mật khẩu đăng nhập, bắt buộc mật khẩu hiện tại, xác nhận và chính sách tối thiểu 8 ký tự gồm chữ hoa, chữ thường và số. Áp dụng cùng chính sách cho đăng ký và đặt lại mật khẩu; không áp đặt lên đăng nhập tài khoản cũ.
- Đăng ký kiểm tra confirmPassword ở server; email không tồn tại và sai mật khẩu đều trả 401 (thay đổi 401 đã có sẵn trước khi bắt đầu).
- Thêm chia sẻ bài công khai (hoặc bài riêng của chính người chia sẻ), lưu `originalPostId` và gửi notification `share`. Bài chia sẻ bị xóa mềm cùng nguồn; quyền riêng tư/block nguồn được kiểm tra khi đọc bài và trong feed.
- Test các nhánh đổi hành vi trọng yếu; giao diện đăng ký/reset/share và đổi mật khẩu hoàn tất ở giai đoạn 8.
