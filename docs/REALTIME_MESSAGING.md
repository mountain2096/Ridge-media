# UC23 - Nhắn tin và thông báo thời gian thực (Socket.IO)

Tài liệu thiết kế và hướng dẫn áp dụng cho Codex. Nhánh gốc: `feat/ui-redesign` (commit `a2cd9ea`). Nhánh làm việc đề xuất: `feat/realtime-messaging`.

## 1. Mục tiêu

Trước đây tin nhắn và thông báo cập nhật bằng polling (danh sách hội thoại mỗi 10 giây, tin nhắn đang mở mỗi 5 giây, số đếm trên thanh trên cùng mỗi 10 giây). Bản này chuyển sang đẩy sự kiện qua WebSocket:

- Tin nhắn đến ngay lập tức, không cần tải lại.
- Hiển thị "đang nhập..." khi người kia gõ.
- Hiển thị "Đã xem" / "Đã gửi" dưới tin nhắn cuối của mình.
- Thông báo (kết bạn, thích, bình luận, chia sẻ) hiện ngay: chấm đỏ trên chuông, danh sách cập nhật và có toast.
- Số tin chưa đọc và số lời mời kết bạn cập nhật ngay.

Không đổi các API REST hiện có. REST vẫn là nguồn sự thật (gửi tin, đánh dấu đã đọc, tải lịch sử); socket chỉ đẩy sự kiện. Polling vẫn còn như phương án dự phòng chậm, chỉ chạy khi socket mất kết nối.

## 2. Kiến trúc

```
Trình duyệt A ──REST──► Express ──ghi──► MongoDB
      ▲                    │
      └──── WebSocket ◄────┘ (Socket.IO, phòng "user:<id>")
Trình duyệt B ◄── WebSocket ──┘
```

- Mỗi người dùng khi kết nối tự vào phòng `user:<userId>`; nhiều tab cùng nhận sự kiện.
- Controller và model đẩy sự kiện qua `server/utils/realtime.js` (`emitToUser`). Nếu chưa có Socket.IO (unit test, script), lệnh đẩy không làm gì.
- Server khởi động bằng `http.createServer(app)` để Express và Socket.IO dùng chung cổng.

## 3. Sự kiện

| Sự kiện | Hướng | Dữ liệu | Khi nào |
|---|---|---|---|
| `message:new` | server → client | `{ conversationId, message }` | Sau khi `sendMessage` lưu tin. Gửi cho người nhận và các tab khác của người gửi |
| `message:read` | server → client | `{ conversationId, readerId, readAt }` | Khi `markMessageIsRead` thực sự đánh dấu thêm tin đã đọc. Gửi cho người gửi |
| `notification:new` | server → client | `{ notification }` (đã kèm `senderId.username/profilePicture`) | Sau mỗi `Notification.create`, trừ loại `message` |
| `typing:start`, `typing:stop` | client → server | `{ conversationId }` | Người dùng bắt đầu / ngừng gõ |
| `typing` | server → client | `{ conversationId, userId, isTyping }` | Server chuyển tiếp cho người còn lại |

Thông báo loại `message` không đẩy vào chuông: huy hiệu tin nhắn đã đảm nhiệm, và mỗi tin một dòng thông báo sẽ làm tràn danh sách.

## 4. Bảo mật

- Bắt tay Socket.IO yêu cầu JWT trong `auth.token`. Token sai hoặc tài khoản bị khóa (`isLocked`) bị từ chối với lỗi `UNAUTHORIZED`.
- Sự kiện `typing` chỉ được chuyển khi người gửi thuộc hội thoại, hội thoại không bị ẩn và không ai chặn ai (cùng quy tắc với REST). ID không hợp lệ bị bỏ qua.
- Server giới hạn tối đa 1 sự kiện `typing` giống nhau mỗi giây trên mỗi socket.
- CORS của Socket.IO dùng chính hàm `isAllowedOrigin` của Express.
- Client lấy token mới ở mỗi lần (tái) kết nối.

## 5. Thay đổi theo tệp

Server:
- `server/utils/realtime.js` (mới): đăng ký Socket.IO và `emitToUser`.
- `server/socket.js` (mới): xác thực bắt tay, vào phòng người dùng, xử lý `typing`. `require("socket.io")` chỉ chạy trong `initSocket` nên các test khác không cần gói này.
- `server/server.js`: tạo `http.createServer(app)`, gọi `initSocket` trong `startServer`.
- `server/models/Message.js`: thêm `readAt` (Date, mặc định null).
- `server/controllers/messageCotrollers.js`: đẩy `message:new` và `message:read`; `markMessageIsRead` ghi thêm `readAt`.
- `server/models/Notification.js`: hook `post("save")` đẩy `notification:new`.
- `server/test/realtime.test.js` (mới): 5 test.

Client:
- `client/src/lib/socket.js` (mới): một kết nối dùng chung (`getSocket`, `connectSocket`, `disconnectSocket`).
- `client/src/AppLayout.jsx`: kết nối khi vào ứng dụng, nhận `notification:new` và `message:new`, tải thông báo ngay lúc đầu để chuông có chấm đỏ, toast, polling dự phòng 30 giây khi mất kết nối.
- `client/src/components/MessagesView.jsx`: nhận `message:new`, `message:read`, `typing`; gửi `typing:start/stop`; "Đã xem/Đã gửi"; chống trùng tin khi socket đến trước phản hồi HTTP; đồng bộ lại sau khi kết nối lại.
- `client/src/messages.css`: kiểu cho "đang nhập..." và dòng trạng thái.

## 6. Gói cần cài (cần người dùng duyệt trước)

- Gốc dự án: `npm install socket.io@^4.8.4`
- Client: `npm install socket.io-client@^4.8 --prefix client`

Phiên bản 4.8.4 là bản mới nhất theo trang cài đặt của socket.io tại thời điểm viết (tháng 9/2026). Kiểm tra lại khi cài.

## 7. Hướng dẫn cho Codex

1. Làm trên nhánh mới `feat/realtime-messaging` tạo từ `feat/ui-redesign`. Kiểm tra `git status`, không đụng thay đổi không liên quan.
2. Áp dụng patch đi kèm (`0001-feat-realtime-*.patch`) bằng `git apply --check` rồi `git am` (hoặc `git apply`). Nếu không áp được do nhánh đã đổi, tự áp dụng theo đúng mô tả ở mục 3 và 5, giữ nguyên hành vi API cũ.
3. Chỉ cài hai gói ở mục 6 sau khi người dùng đồng ý. Không cài gói nào khác.
4. Chạy `node --test`, `npm run lint --prefix client`, `npm run build --prefix client`. Sửa lỗi lint (đặc biệt các luật react-hooks mới) mà không đổi hành vi. Báo cáo kết quả thật, không bỏ qua test lỗi.
5. Kiểm tra thủ công theo mục 8 với hai trình duyệt, API kết nối được MongoDB.
6. Commit nhỏ, thông điệp rõ. Không commit `.env`, không `git push --force`.

## 8. Kịch bản kiểm thử thủ công

Chuẩn bị: hai tài khoản đã là bạn bè, đăng nhập ở hai trình duyệt (hoặc một cửa sổ ẩn danh).

1. A mở trang Tin nhắn với B; B mở trang Tin nhắn với A. A gõ: B thấy "A đang nhập..." trong 1 giây. A ngừng gõ 2 giây: dòng này biến mất.
2. A gửi tin: B thấy ngay, không tải lại. Dưới tin của A hiện "Đã xem" ngay khi B đang mở hội thoại và tab đang hiển thị.
3. B chuyển sang trang Bảng tin (không ở Tin nhắn). A gửi tin: B thấy toast và huy hiệu tin nhắn tăng ngay. B vào Tin nhắn: huy hiệu về 0, A thấy "Đã xem".
4. A gửi lời mời kết bạn tới C / thích bài của C: C thấy chấm đỏ trên chuông, toast và dòng mới trong danh sách ngay.
5. Tắt API vài giây rồi bật lại: trang không lỗi, sau khi kết nối lại dữ liệu tự đồng bộ.
6. Chặn: B chặn A, rồi A gõ hoặc gửi tin: B không nhận "đang nhập" và không nhận tin.

## 9. Giới hạn đã biết

- Một tiến trình server duy nhất: phòng Socket.IO nằm trong bộ nhớ. Muốn chạy nhiều tiến trình cần Redis adapter (ngoài phạm vi đồ án).
- "Đã xem" dựa trên `isRead` của hội thoại 1-1; chưa có chế độ nhóm.
- Trạng thái trực tuyến vẫn dùng heartbeat hiện có, chưa chuyển sang socket.
- Sự kiện lỡ khi mất kết nối được bù bằng tải lại sau khi kết nối lại, không phát lại từng sự kiện.
- Bản patch được kiểm tra bằng bản giả lập mongoose/jsonwebtoken và kiểm tra cú pháp JSX; chưa chạy với phụ thuộc thật, MongoDB thật hay trình duyệt. Cần bước 4 và 5 ở mục 7.

## 10. Nội dung cho người viết báo cáo

**UC23 - Nhắn tin và nhận thông báo thời gian thực**
- Tác nhân: Người dùng đã đăng nhập.
- Tiền điều kiện: Đăng nhập; hai người là bạn bè và không chặn nhau.
- Luồng chính: (1) Hệ thống mở kết nối WebSocket có xác thực JWT khi người dùng vào ứng dụng. (2) Người dùng gửi tin, hệ thống lưu vào cơ sở dữ liệu rồi đẩy tin tới người nhận. (3) Khi người nhận mở hội thoại, hệ thống đánh dấu đã đọc và báo "Đã xem" cho người gửi. (4) Khi một người đang gõ, người kia thấy "đang nhập...". (5) Khi có thông báo mới (kết bạn, thích, bình luận, chia sẻ), hệ thống đẩy ngay tới người nhận.
- Luồng thay thế: Mất kết nối WebSocket thì client tải dữ liệu định kỳ bằng REST và đồng bộ lại khi kết nối trở lại. Bị chặn hoặc tài khoản bị khóa thì không nhận sự kiện.
- Hậu điều kiện: Tin nhắn và trạng thái đã đọc được lưu; người nhận thấy thay đổi mà không cần tải lại trang.

Thay đổi dữ liệu (ERD): bảng `Message` thêm trường `readAt` (thời điểm đọc). Kiến trúc: thêm kênh WebSocket (Socket.IO) song song với REST API giữa client và server Express.
