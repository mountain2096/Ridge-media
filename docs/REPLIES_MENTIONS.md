# Trả lời bình luận (UC27) và nhắc tên @ (UC28)

Tài liệu này dành cho người viết báo cáo đặc tả.

## UC27 – Trả lời bình luận

| Mục | Nội dung |
|---|---|
| Tác nhân | Người dùng đã đăng nhập |
| Mục đích | Trả lời trực tiếp một bình luận, câu trả lời nằm ngay dưới bình luận đó |
| Tiền điều kiện | Đã đăng nhập; đã mở phần bình luận của một bài đăng còn hiển thị |
| Hậu điều kiện | Câu trả lời được lưu và hiện thụt vào dưới bình luận gốc; tác giả bình luận gốc nhận thông báo |

### Luồng chính
1. Người dùng bấm "Trả lời" dưới một bình luận.
2. Hệ thống hiện dòng "Đang trả lời <tên>" phía trên ô nhập và điền sẵn `@tên`.
3. Người dùng nhập nội dung và bấm "Gửi".
4. Hệ thống lưu câu trả lời, hiện nó thụt vào dưới bình luận gốc và gửi thông báo "đã trả lời bình luận của bạn" cho tác giả bình luận gốc.

### Luồng thay thế
- **A1 – Hủy trả lời:** bấm dấu × trên dòng "Đang trả lời"; ô nhập trở lại bình thường.
- **A2 – Trả lời một câu trả lời:** câu trả lời mới vẫn nằm dưới bình luận gốc cấp cao nhất (chỉ có hai cấp), kèm `@tên` của người được trả lời.
- **A3 – Bình luận gốc đã bị xóa:** hệ thống từ chối lưu câu trả lời (400).
- **A4 – Xóa bình luận gốc:** toàn bộ câu trả lời của nó cũng bị xóa; số bình luận của bài giảm tương ứng. Xóa một câu trả lời thì chỉ xóa câu đó.

### Quy tắc nghiệp vụ
- Chỉ có hai cấp: bình luận và câu trả lời.
- Câu trả lời phải thuộc cùng bài đăng với bình luận gốc.
- Mỗi người chỉ nhận một thông báo cho mỗi bình luận, ưu tiên: trả lời, bình luận (tác giả bài đăng), nhắc tên.
- Quyền sửa, xóa, báo cáo và thả cảm xúc của câu trả lời giống bình luận thường.

## UC28 – Nhắc tên (@)

| Mục | Nội dung |
|---|---|
| Tác nhân | Người dùng đã đăng nhập |
| Mục đích | Gọi một người cụ thể vào cuộc trò chuyện dưới bài đăng |
| Tiền điều kiện | Đã đăng nhập; đang viết bình luận hoặc câu trả lời |
| Hậu điều kiện | Tên được nhắc hiện thành liên kết tới trang cá nhân; người được nhắc nhận thông báo |

### Luồng chính
1. Người dùng gõ `@` trong ô bình luận.
2. Hệ thống gợi ý tối đa 6 người (bạn bè, tác giả bài đăng và những người đã bình luận trong bài) theo chữ đang gõ.
3. Người dùng chọn một người (chuột, hoặc phím mũi tên và Enter).
4. Hệ thống điền `@tên` vào ô nhập; người dùng gửi bình luận.
5. Hệ thống lưu danh sách người được nhắc, hiển thị `@tên` thành liên kết, và gửi thông báo "đã nhắc đến bạn trong một bình luận" cho từng người.

### Luồng thay thế
- **A1 – Bấm Esc:** đóng danh sách gợi ý.
- **A2 – Tên không tồn tại:** giữ nguyên là chữ thường, không có thông báo.
- **A3 – Người bị chặn (hai chiều), tài khoản bị khóa hoặc người không có quyền xem bài** (bài chỉ dành cho bạn bè mà người đó không phải bạn của tác giả): không gửi thông báo và không tạo liên kết.
- **A4 – Tự nhắc tên mình:** không gửi thông báo.

### Quy tắc nghiệp vụ
- Tối đa 5 người được nhắc trong một bình luận.
- Không nhận diện địa chỉ e-mail như `a@b.com`.
- Hiện chỉ áp dụng cho bình luận và câu trả lời (chưa áp dụng cho nội dung bài đăng và tin nhắn).

## API và dữ liệu

| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| POST | `/api/comment/:postId` | Body `{ "content": "...", "parentId": "<id bình luận gốc, tùy chọn>" }` |
| GET | `/api/comment/:postId` | Trả về mọi bình luận và câu trả lời (có `parentId`, `mentions`), client tự gom nhóm |
| DELETE | `/api/comment/:id` | Xóa bình luận; trả về `removed` là số bình luận bị xóa (kể cả câu trả lời) |

Dữ liệu: bình luận có thêm `parentId` (rỗng nếu là bình luận cấp cao nhất) và `mentions` (danh sách người được nhắc). Thông báo có thêm hai loại `reply` và `mention`.

## Giới hạn
- Chỉ hai cấp trả lời.
- Gợi ý nhắc tên chỉ lấy từ bạn bè, tác giả bài đăng và người đã bình luận trong bài, chưa tìm toàn bộ người dùng.
- Sửa bình luận không cập nhật lại danh sách người được nhắc.

## Dữ liệu demo
Sau khi chạy lại `node server/scripts/seed-demo.js --yes`: bài của `minh_anh` có chuỗi trả lời giữa `minh_anh` và `hoang_nam`; bài của `hoang_nam` có một bình luận nhắc `@hoang_nam`. `hoang_nam` nhận thêm hai thông báo (trả lời, nhắc tên).
