# Thả cảm xúc (UC26)

Tài liệu này dành cho người viết báo cáo đặc tả. Tính năng này mở rộng nút "Thích" cũ thành 6 cảm xúc, dùng cho bài đăng, bình luận và tin nhắn.

## UC26 – Thả cảm xúc

| Mục | Nội dung |
|---|---|
| Tác nhân | Người dùng đã đăng nhập |
| Mục đích | Bày tỏ phản ứng nhanh với một bài đăng, bình luận hoặc tin nhắn mà không cần viết chữ |
| Tiền điều kiện | Đã đăng nhập; nội dung còn hiển thị với người dùng; giữa hai người không có quan hệ chặn |
| Hậu điều kiện | Cảm xúc của người dùng được lưu; số đếm theo từng loại được cập nhật; tác giả nhận thông báo (nếu có) |

**Sáu cảm xúc:** Thích, Yêu thích, Haha, Wow, Buồn, Phẫn nộ.

### Luồng chính
1. Người dùng rê chuột (hoặc giữ lâu trên điện thoại, hoặc nhấn mũi tên lên khi đang chọn nút) vào nút "Thích" của bài đăng, bình luận hoặc tin nhắn.
2. Hệ thống hiện thanh sáu cảm xúc.
3. Người dùng chọn một cảm xúc.
4. Hệ thống lưu cảm xúc, cập nhật biểu tượng và số đếm trên màn hình người dùng.
5. Với bài đăng và bình luận, hệ thống gửi thông báo tức thì cho tác giả (không gửi khi tự thả cảm xúc cho nội dung của mình).
6. Với tin nhắn, hệ thống đẩy cảm xúc qua Socket.IO nên cả hai người thấy ngay mà không cần tải lại.

### Luồng thay thế
- **A1 – Bấm nhanh vào nút:** thả "Thích"; nếu đã có cảm xúc thì bỏ cảm xúc đó.
- **A2 – Chọn lại đúng cảm xúc đang có:** cảm xúc bị gỡ.
- **A3 – Chọn cảm xúc khác:** cảm xúc cũ được thay bằng cảm xúc mới (mỗi người chỉ có một cảm xúc trên mỗi nội dung). Việc đổi không tạo thêm thông báo.
- **A4 – Nội dung không còn, bị xóa, bị ẩn hoặc bị chặn:** hệ thống từ chối (404 hoặc 403) và không lưu gì.
- **A5 – Loại cảm xúc không hợp lệ:** hệ thống từ chối (400).
- **A6 – Mất mạng:** hiện thông báo lỗi, giao diện giữ nguyên trạng thái cũ.

### Quy tắc nghiệp vụ
- Mỗi người chỉ có tối đa một cảm xúc trên một bài đăng, bình luận hoặc tin nhắn.
- Danh sách "đã thích" cũ vẫn được giữ: người từng bấm "Thích" được tính là cảm xúc "Thích", không mất dữ liệu.
- Không thể thả cảm xúc cho bài `private` của người khác, bài chỉ dành cho bạn bè khi không phải bạn bè, hoặc khi một trong hai người đã chặn người kia.
- Tin nhắn chỉ thả được trong cuộc trò chuyện mình tham gia, chưa ẩn và không bị chặn.

## Lưu bài viết và Chia sẻ bài viết

Hai tính năng này **đã có từ phiên bản đầu** (nút "Lưu bài viết", nút "Chia sẻ"), không thêm ở đợt này. Nếu báo cáo đã có use case tương ứng thì giữ nguyên; không cần use case mới.

## API (cho phần mô tả kỹ thuật)

| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| PUT | `/api/post/:id/reaction` | Thả hoặc đổi cảm xúc, body `{ "type": "love" }` |
| DELETE | `/api/post/:id/reaction` | Bỏ cảm xúc |
| PUT / DELETE | `/api/comment/:id/reaction` | Như trên, cho bình luận |
| PUT / DELETE | `/api/message/conversation/:conversationId/messages/:messageId/reaction` | Như trên, cho tin nhắn |

`type` là một trong: `like`, `love`, `haha`, `wow`, `sad`, `angry`. Mọi đường dẫn đều cần đăng nhập. Sự kiện Socket.IO `message:reaction` báo cho cả hai người trong cuộc trò chuyện.

Dữ liệu: trường `reactions` (mảng `{ userId, reaction }`) được thêm vào bài đăng, bình luận và tin nhắn. Trường `likes` của bài đăng vẫn liệt kê mọi người đã thả cảm xúc nên màn hình và thống kê cũ không bị hỏng. Thông báo có thêm trường `reaction`.

## Giới hạn
- Chưa có danh sách "ai đã thả cảm xúc gì" (chỉ có số đếm theo loại).
- Trang cá nhân vẫn dùng nút "Thích" cũ cho đến khi được đổi sang giao diện mới; dữ liệu hai bên vẫn khớp nhau.
- Thông báo cảm xúc dùng loại thông báo "like" kèm tên cảm xúc.

## Dữ liệu demo
Script `server/scripts/seed-demo.js` nạp sẵn cảm xúc đủ 6 loại trên bài đăng, một số bình luận và tin nhắn, cùng 2 bài đã lưu cho `minh_anh`. Hàng đợi kiểm duyệt không đổi (2 cao, 3 trung bình, 2 thấp). Cần chạy lại script (`--yes`) để dữ liệu mới có hiệu lực.
