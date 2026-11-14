# Rà soát use case sau lộ trình sửa

Trạng thái dưới đây được đối chiếu với backend và client hiện có sau các commit trên nhánh `fix/audit-roadmap`.

| UC | Tên | Trạng thái | Ghi chú đã xác minh |
|---|---|---|---|
| UC01 | Đăng ký | 🟢 Hoàn tất | Server yêu cầu mật khẩu xác nhận; mật khẩu tối thiểu 8 ký tự có chữ hoa, chữ thường và số; username/email có unique index. Client gửi xác nhận và mô tả yêu cầu mật khẩu. |
| UC02 | Đăng nhập | 🟢 Hoàn tất | Tài khoản khóa bị từ chối; email không tồn tại và sai mật khẩu cùng trả 401. |
| UC03 | Đăng xuất | 🟡 Một phần | Client xóa token khỏi localStorage; JWT không bị thu hồi phía server. |
| UC04 | Xem trang cá nhân | 🟡 Một phần | API hồ sơ yêu cầu đăng nhập; không có trang hồ sơ công khai/khách trong client. Bài viết newsfeed có lọc quyền riêng tư. |
| UC05 | Cập nhật thông tin | 🟢 Hoàn tất | Có cập nhật hồ sơ, bio, ảnh và ngày sinh; ngày sinh tương lai/không hợp lệ bị từ chối. |
| UC06 | Đổi mật khẩu | 🟢 Hoàn tất | Có form và API đổi mật khẩu yêu cầu mật khẩu hiện tại, xác nhận và chính sách mật khẩu. |
| UC07 | Quản lý chặn | 🟢 Phần lớn hoàn tất | Có block/unblock UI, danh sách chặn; chặn xóa quan hệ bạn bè và lời mời pending hai chiều. |
| UC08 | Đăng bài | 🟡 Một phần | Có chọn public/friends/private và status; tải media qua endpoint giới hạn MIME/kích thước. API đăng bài vẫn nhận chuỗi media URL tùy ý nếu gọi trực tiếp. |
| UC09 | Sửa bài | 🟡 Một phần | Chủ bài được sửa; chưa có nhãn “đã chỉnh sửa”. |
| UC10 | Xóa bài | 🟢 Hoàn tất | Xóa mềm bằng status; chủ bài/Admin được xóa; share của bài nguồn cũng được đánh dấu deleted. |
| UC11 | Thích / Bỏ thích | 🟡 Một phần | Có like/unlike và notification; chưa gom nhóm thông báo hoặc kiểm chứng chống trùng thông báo. |
| UC12 | Bình luận | 🟢 Phần lớn hoàn tất | Tạo/sửa/xem bình luận đang hoạt động; có thêm sửa bình luận ngoài đặc tả. |
| UC13 | Xóa bình luận | 🟢 Hoàn tất | Tác giả bình luận, chủ bài và Admin được xóa mềm; bình luận đã xóa không được trả về. |
| UC14 | Chia sẻ bài | 🟢 Phần lớn hoàn tất | Tạo post có originalPostId và notification share; bài người khác chỉ chia sẻ được khi public; nguồn bị xóa/block/quyền riêng tư không phù hợp sẽ không hiển thị. |
| UC15 | Báo cáo vi phạm | 🟢 Hoàn tất | Có thể báo cáo bài/bình luận đang hoạt động; chống báo trùng; Admin xử lý trạng thái báo cáo. |
| UC16 | Tìm kiếm người dùng | 🟡 Một phần | Regex an toàn, loại người bị chặn và tài khoản khóa; route vẫn yêu cầu đăng nhập nên khách không tìm kiếm được. |
| UC17 | Quản lý kết bạn | 🟢 Phần lớn hoàn tất | Có gửi/nhận/xử lý lời mời; unique partial index chặn trùng pending cùng chiều; dữ liệu trùng cũ khiến migration dừng an toàn để xử lý thủ công. |
| UC18 | Xem thông báo | 🟢 Phần lớn hoàn tất | Hỗ trợ type share/system; client hiển thị thông báo share. Thông báo system dùng nhãn chung. |
| UC19 | Nhắn tin 1-1 | 🟢 Phần lớn hoàn tất | Tạo hội thoại, gửi/đọc tin và danh sách hội thoại kiểm tra block hai chiều; cập nhật client vẫn polling. |
| UC20 | Quản lý người dùng (Admin) | 🟢 Phần lớn hoàn tất | Admin có danh sách người dùng và khóa/mở khóa; Admin khác không thể tự khóa hoặc khóa tài khoản Admin. |
| UC21 | Duyệt báo cáo (Admin) | 🟢 Phần lớn hoàn tất | Admin xem báo cáo pending và ghi nhận reviewed/actioned cùng người/thời điểm xử lý; actioned chỉ ghi nhận quyết định, không tự xóa nội dung. |
| UC22 | Bảng tin | 🟢 Hoàn tất | Newsfeed lọc status, privacy, block hai chiều và nguồn share; phân trang mặc định 20, tối đa 50, có nút tải thêm. |

## Ghi chú vận hành

- `privacy` của bài cũ mặc định public theo model/migration status hiện có.
- Migration unique index kiểm tra dữ liệu trùng trước khi tạo index, không xóa hoặc sửa dữ liệu cũ. Cần chạy `node server/scripts/migrate-unique-indexes.js` trong môi trường đã cấu hình `MONGO_URI` trước khi dựa vào unique index trong DB cũ.
- Repo không khai báo script backend lint riêng; `node --test` được dùng cho các test backend. Client có lint và build.
