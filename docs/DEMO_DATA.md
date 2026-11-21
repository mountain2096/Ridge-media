# Dữ liệu demo

Script `server/scripts/seed-demo.js` nạp một bộ dữ liệu mẫu để buổi demo có sẵn: biểu đồ thống kê có hình dạng, hàng đợi kiểm duyệt đủ các mức, tin nhắn và thông báo chưa đọc. Phần tạo dữ liệu nằm ở `server/scripts/demo-data.js` (không cần kết nối MongoDB, có test trong `server/test/demo-data.test.js`).

## Chuẩn bị database trên Atlas

1. Dùng **một database riêng cho demo**, tên có chữ `demo`. Trong `.env`, đổi tên database ở cuối `MONGO_URI`, ví dụ:
   `mongodb+srv://<user>:<mật khẩu>@<cluster>.mongodb.net/ridge_demo?retryWrites=true&w=majority`
   Atlas tự tạo database khi có dữ liệu đầu tiên. Hãy giữ lại chuỗi kết nối cũ ở nơi khác để quay về dữ liệu thật.
2. Trong Atlas, mục **Network Access**, cho phép địa chỉ IP của nơi demo. Ở nơi lạ (trường, quán cà phê) IP thay đổi, nên trong ngày demo có thể tạm cho phép `0.0.0.0/0` rồi xóa sau buổi báo cáo.
3. Tài khoản database user cần quyền đọc và ghi (readWrite) trên database demo.

## Chạy script

Từ thư mục dự án (`C:\Ridge Project`):

```
node server/scripts/seed-demo.js          # chạy thử: chỉ cho biết sẽ làm gì, chưa ghi gì
node server/scripts/seed-demo.js --yes    # xóa dữ liệu demo cũ và nạp dữ liệu mới
```

An toàn:
- Script **dừng lại** nếu tên database không chứa chữ `demo` (có thể ép bằng `--allow-any-db`, không nên dùng).
- Chỉ xóa dữ liệu thuộc các tài khoản có email đuôi `@ridge.demo` và dữ liệu liên quan tới chúng.
- Không ghi gì nếu thiếu `--yes`.

**Chạy lại vào sáng ngày báo cáo.** Mọi mốc thời gian tính từ lúc chạy script. Điểm ưu tiên kiểm duyệt giảm theo độ mới của báo cáo, nên nếu nạp từ vài ngày trước thì các báo cáo sẽ "cũ" và mức ưu tiên sẽ khác bảng bên dưới. Nạp lại ngay trước buổi báo cáo là có đúng kết quả.

## Tài khoản demo

Mật khẩu của mọi tài khoản: `Demo@1234`

| Tài khoản (email) | Vai trò trong demo |
|---|---|
| `demo_admin@ridge.demo` | Quản trị viên: xem Thống kê, Kiểm duyệt, Tài khoản |
| `minh_anh@ridge.demo` | Người dùng 1, cửa sổ A khi demo tin nhắn. Có 2 lời mời kết bạn, 1 tin nhắn chưa đọc, vài thông báo chưa đọc |
| `hoang_nam@ridge.demo` | Người dùng 2, cửa sổ B. Đã có cuộc trò chuyện với `minh_anh` |
| `spam_acc99@ridge.demo` | Tài khoản bị khóa (hiện ở tab Tài khoản) |

Dữ liệu gồm 17 tài khoản, 42 bài đăng, 37 bình luận, 20 báo cáo, 5 cuộc trò chuyện, 26 tin nhắn, 10 thông báo. Có cả bài ở chế độ bạn bè, bài bị ẩn, bài đã xóa và bài chia sẻ. Không có ảnh hay video (mọi tài khoản dùng chữ cái đầu làm ảnh đại diện).

## Câu chuyện của hàng đợi kiểm duyệt

Có 7 mục đang chờ, được dựng để cho thấy từng quy tắc tính điểm. Điểm dưới đây là kết quả của script ngay lúc nạp (số thật lệch vài điểm nếu bạn mở sau vài giờ vì phần độ mới giảm dần).

| Điểm | Mức | Nội dung | Vì sao |
|---|---|---|---|
| 93 | Cao | Bài đe dọa của `viet_dung` | 4 người báo cáo, lý do bạo lực, tác giả từng bị xử lý, báo cáo vừa xong |
| 68 | Cao | Bình luận xúc phạm của `viet_dung` | Chỉ 2 người báo cáo nhưng cùng một tác giả bị báo nhiều lần |
| 52 | Trung bình | Bài của `duc_thinh` nói đùa về việc đập máy tính | Lý do "bạo lực" nặng nhưng chỉ 1 người báo cáo |
| 49 | Trung bình | Bài thông tin y tế sai của `gia_han` | 2 người báo cáo lý do thông tin sai lệch |
| 42 | Trung bình | Bài spam kiếm tiền của `viet_dung` | Báo cáo đã cũ nhưng tác giả có lịch sử, nên vẫn cao hơn các mục spam khác |
| 24 | Thấp | Bình luận quảng cáo của `gia_han` | 1 báo cáo, lý do spam, đã cũ |
| 19 | Thấp | Bài mua follow của tài khoản bị khóa | 1 báo cáo spam, đã cũ |

Ngoài ra có 8 báo cáo đã xem hoặc đã xử lý (2 trong số đó là vụ cũ của `viet_dung`), rải trong vài tuần để biểu đồ "báo cáo mới" có dữ liệu.

## Nếu Atlas báo lỗi DNS `ETIMEOUT`

Lỗi `querySrv ETIMEOUT` hoặc `ETIMEOUT` khi kết nối với địa chỉ `mongodb+srv://` thường do DNS của mạng đang dùng không phân giải được địa chỉ Atlas. Cách thử, theo thứ tự:

1. Thêm một dòng vào `.env`: `DNS_SERVERS=8.8.8.8,1.1.1.1` rồi chạy lại. Server và script đều đọc biến này (không đặt thì dùng DNS của hệ thống như cũ).
2. Đổi mạng, ví dụ phát 4G từ điện thoại.
3. Dùng chuỗi kết nối kiểu cũ `mongodb://` (không phải `mongodb+srv://`) lấy từ Atlas, mục Connect, chọn driver Node.js với phiên bản cũ. Chuỗi này không cần tra DNS kiểu SRV.
4. Phương án cuối: MongoDB cài trên máy (`MONGO_URI=mongodb://127.0.0.1:27017/ridge_demo`) rồi chạy script nạp dữ liệu như trên.
