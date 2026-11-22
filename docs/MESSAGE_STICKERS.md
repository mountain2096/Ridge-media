# Kho biểu tượng trong tin nhắn (UC29)

Tài liệu này dành cho người viết báo cáo đặc tả. Tính năng thêm bảng chọn **emoji** và **nhãn dán (sticker)** vào ô nhập tin nhắn.

## UC29 – Gửi biểu tượng và nhãn dán

| Mục | Nội dung |
|---|---|
| Tác nhân | Người dùng đã đăng nhập |
| Mục đích | Diễn đạt cảm xúc nhanh trong cuộc trò chuyện bằng emoji hoặc nhãn dán |
| Tiền điều kiện | Đã đăng nhập; đang mở một cuộc trò chuyện còn hiển thị, giữa hai người không có quan hệ chặn |
| Hậu điều kiện | Emoji nằm trong nội dung tin nhắn; hoặc một tin nhắn nhãn dán được lưu và hiện ngay cho cả hai người |

### Luồng chính – chèn emoji
1. Người dùng bấm nút mặt cười bên trái ô nhập tin nhắn.
2. Hệ thống mở bảng chọn với các tab: Gần đây, Cảm xúc, Cử chỉ, Tim & ăn mừng, Thiên nhiên, Đồ vật & đồ ăn, Nhãn dán.
3. Người dùng chọn một emoji; hệ thống chèn nó vào đúng vị trí con trỏ trong ô nhập, bảng vẫn mở để chọn tiếp.
4. Người dùng bấm "Gửi" như tin nhắn thường.

### Luồng chính – gửi nhãn dán
1. Người dùng mở bảng chọn và chuyển sang tab "Nhãn dán" (hoặc gõ từ khóa vào ô tìm kiếm).
2. Người dùng chọn một nhãn dán.
3. Hệ thống gửi ngay, không cần bấm "Gửi"; bảng chọn đóng lại.
4. Nhãn dán hiện thành ảnh lớn, không có khung tin nhắn, ở cả hai phía qua Socket.IO (cơ chế như tin nhắn thường).

### Luồng thay thế
- **A1 – Tìm kiếm:** gõ từ khóa (có dấu hoặc không dấu, ví dụ "cuoi", "cảm ơn"); bảng hiện emoji và nhãn dán khớp. Không có kết quả thì hiện "Không tìm thấy kết quả."
- **A2 – Đóng bảng:** bấm ra ngoài, bấm lại nút mặt cười, hoặc nhấn Esc.
- **A3 – Emoji gần đây:** emoji vừa chọn được nhớ tối đa 24 cái trên trình duyệt, hiện ở tab "Gần đây".
- **A4 – Nhãn dán không hợp lệ** (mã không có trong danh sách của máy chủ): hệ thống từ chối (400) và không lưu gì.
- **A5 – Cuộc trò chuyện bị ẩn hoặc bị chặn:** giống tin nhắn thường (403/404).
- **A6 – Vượt 2000 ký tự khi chèn emoji:** emoji không được chèn.
- **A7 – Máy khách cũ hoặc thiếu ảnh nhãn dán:** hiện chữ "Đã gửi một nhãn dán" thay cho ảnh.

### Quy tắc nghiệp vụ
- Emoji là ký tự Unicode trong `content`, giới hạn 2000 ký tự như tin nhắn thường.
- Nhãn dán là một loại tin nhắn riêng (`type = "sticker"`); mỗi tin chỉ có một nhãn dán.
- Máy chủ chỉ chấp nhận mã nhãn dán nằm trong danh sách cho phép (`server/utils/stickers.js`). Nếu gửi kèm cả `content`, nội dung chữ bị bỏ qua.
- Có thể thả cảm xúc (UC26) lên tin nhắn nhãn dán như tin nhắn thường.

## Danh sách nhãn dán

Hai bộ, mỗi bộ 8 nhãn dán, do dự án tự vẽ bằng SVG (không dùng ảnh hay phông chữ bên ngoài, không vướng bản quyền):

| Bộ | Mã nhãn dán |
|---|---|
| Mặt cười Ridge (`faces`) | `faces-smile`, `faces-laugh`, `faces-love`, `faces-wink`, `faces-sad`, `faces-angry`, `faces-sleepy`, `faces-cool` |
| Lời nhắn (`words`) | `words-hello`, `words-thanks`, `words-ok`, `words-great`, `words-sorry`, `words-goodnight`, `words-haha`, `words-wait` |

## API và dữ liệu

Không thêm đường dẫn mới. `POST /api/message/conversation/:conversationId/messages` nhận một trong hai dạng body:

- `{ "content": "xin chào 😀" }` – tin nhắn chữ (có thể chứa emoji), như trước.
- `{ "stickerId": "faces-love" }` – tin nhắn nhãn dán.

Dữ liệu: tin nhắn có thêm `type` (`text` mặc định hoặc `sticker`) và `stickerId`. Với nhãn dán, `content` được máy chủ ghi là "Đã gửi một nhãn dán" để danh sách hội thoại, toast và máy khách cũ vẫn hiện chữ dễ hiểu. Tin nhắn cũ không có `type` được hiểu là `text`, nên không cần chuyển đổi dữ liệu.

## Giới hạn
- Chưa cho người dùng tự tải nhãn dán lên; thêm nhãn dán mới phải sửa cả danh sách của máy chủ và của máy khách (test `stickers.test.js` báo lỗi nếu hai bên lệch nhau).
- Chưa có nhãn dán động (GIF/Lottie) và chưa gửi được nhãn dán trong bình luận.
- Tìm kiếm emoji dùng từ khóa tiếng Việt tự soạn, chỉ gồm khoảng 150 emoji phổ biến, không phải toàn bộ Unicode.
- Một số emoji mới (ví dụ 🧋) có thể không hiện trên thiết bị rất cũ.
