# BÀN GIAO — Ridge-media

> Dành cho agent mới (Claude, Codex hoặc agent khác) tiếp tục dự án. Đọc cùng `AGENTS.md`. Sau MỖI tính năng xong: cập nhật mục 4, 7 và 8 rồi commit file này.
> Cập nhật lần cuối: 2026-11-22, sau khi sửa luồng cập nhật bài viết (nhánh `feat/edited-post-label`, commit `055d78d`).

## 1. Dự án
- Repo: https://github.com/mountain2096/Ridge-media (public). Mạng xã hội dạng feed: React 19 + Vite 8 (`client/`), Express 5 + MongoDB/Mongoose 9 (`server/`), Socket.IO cho realtime.
- Thư mục máy chủ dự án: `C:\Ridge Project` (Windows, PowerShell). Chủ dự án nói tiếng Việt; giao diện app bằng tiếng Việt.
- Chạy: `npm install` → `npm install --prefix client` → tạo `.env` từ `.env.example` → `npm run dev:all` (web :5173, API :5000). API URL của client đọc từ `VITE_API_URL` (mặc định `http://localhost:5000`) qua `client/src/lib/api.js`.
- Kiểm tra: `node --test` (backend), `npm run lint --prefix client`, `npm run build --prefix client`. Chưa có test client.

## 2. Nhánh Git
Chuỗi nhánh (mỗi nhánh tạo từ nhánh trước): `main` → `fix/audit-roadmap` → `feat/ui-redesign` → `feat/realtime-messaging` → `feat/comment-reaction-list` → **`feat/edited-post-label`** (hiện tại). Nhánh mới cho mỗi tính năng, tạo từ nhánh gần nhất. Push bình thường, KHÔNG `--force`. Chưa có PR nào được xác minh.

## 3. Chức năng đã xác minh trong code
Đăng ký và đăng nhập bằng JWT; quên và đổi mật khẩu (tối thiểu 8 ký tự); trang cá nhân (`/profile/:id`, `ProfilePage.jsx`); bài viết công khai, bạn bè hoặc riêng tư, có thể sửa, xóa mềm, chia sẻ và lưu; feed phân trang 20 bài cùng nút "Tải thêm bài viết"; 6 loại cảm xúc cho bài viết, bình luận và tin nhắn; danh sách cảm xúc cho bài viết và bình luận; trả lời bình luận một cấp và @mention; tin (story); kết bạn, chặn và tìm người dùng; nhắn tin realtime (đang nhập, "Đã xem"), emoji và nhãn dán; thông báo realtime (Socket.IO); báo cáo và trang quản trị (thống kê, hàng đợi kiểm duyệt có điểm ưu tiên); giới hạn tần suất, danh sách cho phép CORS, kiểm tra URL media; script tạo dữ liệu mẫu.

## 4. Trạng thái kiểm thử (cập nhật mỗi vòng)
- Chủ dự án đã tự kiểm tra danh sách cảm xúc trong hộp thoại trên trình duyệt sau khi sửa lỗi tải thêm.
- Vòng 4: `node --test`: 98 bài kiểm tra thành công, không lỗi; lint và bản dựng client đều đạt.
- Bản sửa merge phản hồi PUT: lint và build client đều đạt; đã đọc luồng cập nhật để xác nhận giữ nguyên tác giả, menu và bài chia sẻ, đồng thời nhận nhãn chỉnh sửa ngay trên feed và trang cá nhân.
- Chưa kiểm tra luồng sửa bài trên trình duyệt trong vòng này; chưa xác minh kết nối MongoDB trực tiếp. Không chạy lại `node --test` sau bản sửa client-only.

## 5. Quy trình làm việc (3 bên)
- **Chủ dự án**: test bằng mắt, chọn tính năng, tự `git push`.
- **Claude (chat)**: đọc repo trên GitHub, chia việc nhỏ, viết prompt cho Codex, review diff sau khi chủ dự án push, cập nhật file này. Claude chỉ đọc được bản đã push và không có quyền ghi.
- **Codex CLI (plugin Ponytail mức Full)**: code, lint, build, test.
- Mẫu làm việc một tính năng: mở `codex` → `/new` → chọn "Use current Git worktree" → dán prompt (Codex tự tạo nhánh) → Codex commit nhỏ, không push → chủ dự án test bằng mắt và `git push -u origin <nhánh>` → Claude review diff → cập nhật handoff.
- Quy tắc prompt cho Codex: nêu rõ file cần sửa; dùng `git add <file cụ thể>`, không `git add .`; không push, không xóa file (chỉ di chuyển); chạy test hẹp khi lặp và test đầy đủ ở cuối; báo cáo dưới ~12 dòng.

## 6. Giới hạn đã biết
Tổng quát: realtime hiện chạy trên một tiến trình (cần Redis adapter để mở rộng); xác nhận đã đọc chỉ áp dụng cho hội thoại hai người; JWT chưa bị thu hồi khi đăng xuất; chưa có trang cá nhân cho khách; bài viết được sửa trước thay đổi này chưa có nhãn chỉnh sửa vì không có `editedAt`; thông báo lượt thích chưa được gộp nhóm; trả lời bình luận tối đa hai cấp; nhãn dán chưa tải lên hoặc chuyển động; `FeedPage.jsx` vẫn dài khoảng 1.250 dòng.

Danh sách cảm xúc: bộ đếm tổng có thể tính cả người dùng bị chặn hoặc khóa, trong khi danh sách đã lọc họ; endpoint tải toàn bộ cảm xúc vào bộ nhớ trước khi phân trang, phù hợp với dự án hiện tại nhưng không phù hợp với bài có hàng nghìn lượt; kiểm thử chưa bao phủ riêng cách hiển thị lượt thích cũ hoặc `limit` tối đa 50; hộp thoại có `tablist` nhưng chưa có `tabpanel`.

Đã hoàn thành vòng trước: danh sách cảm xúc áp dụng cho cả bình luận và bài viết; khi đổi thẻ, các dòng cũ được xóa trong lúc tải; số bình luận vẫn nằm sát bên phải khi bài viết chưa có cảm xúc. Vòng 4 giữ các dòng đang hiển thị khi tải thêm.

## 7. Nhật ký các vòng
| Vòng | Công việc | Kết quả | Commit |
|---|---|---|---|
| 0 | Claude rà soát kho mã, nhánh và trạng thái ban đầu | Ban đầu: 92 bài kiểm tra, lint và build đều đạt | `e64c605` |
| 1 | Dọn worktree và cập nhật hướng dẫn/trạng thái dự án | Worktree sạch; đã push | `8c2b008` |
| 2 | API, hộp thoại danh sách cảm xúc bài viết và tài liệu | 94 bài kiểm tra; lint/build đạt; đã kiểm tra trực quan | `a0f8adc`, `6a56d8c`, `da637c2` |
| 3 | API và giao diện danh sách cảm xúc bình luận; sửa chuẩn hóa subdocument Mongoose, bổ sung kiểm thử hồi quy bằng document thật và ghi tài liệu cho hai endpoint | 96 bài kiểm tra; lint/build đạt | `c010ab8`, `a28a27c`, `8fa86f1`, `7bbe25c`, `5f5af78` |
| 4 | Giữ danh sách cảm xúc khi tải thêm; lưu `editedAt` khi nội dung/media thực sự đổi và hiện nhãn trên bài viết; giữ dữ liệu tác giả/bài chia sẻ khi merge phản hồi sửa trên feed và trang cá nhân | 98 bài kiểm tra; lint/build đạt; bản sửa merge đã được rà soát bằng code, chưa kiểm tra trên trình duyệt hoặc MongoDB trực tiếp | `1d957c2`, `1325b25`, `9212f66`, `aec963e`, `d3cc2e2`, `055d78d` |

## 8. Việc có thể làm tiếp (chủ dự án lựa chọn)
Cuộn vô hạn thay cho nút "Tải thêm"; trang cá nhân cho khách; thu hồi JWT khi đăng xuất; tách nhỏ `FeedPage.jsx`; bổ sung các phần kiểm thử còn thiếu ở mục 6.

## 9. Lưu ý cho agent mới
- `docs/STATUS.md` và `docs/AUDIT.md` là snapshot CŨ; luôn kiểm chứng với code và `git log`.
- Không chạy seed hoặc migration vào database thật: script seed chỉ nên chạy với database có chữ `demo` trong tên.
- Bản lưu ngoài repo ở `C:\Ridge_backup\2026-11-22` (file patch cũ, `_share/`); đừng đưa lại vào repo.
- Không commit `.env`, khóa, mật khẩu hay token.
