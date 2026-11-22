# HANDOFF — Ridge-media

> Dành cho agent mới (Claude, Codex hoặc agent khác) tiếp tục dự án. Đọc cùng `AGENTS.md`. Sau MỖI tính năng xong: cập nhật mục 4, 7 và 8 rồi commit file này.
> Cập nhật lần cuối: 2026-11-22, sau tính năng "Danh sách người thả cảm xúc cho bài viết" (nhánh `feat/reaction-list`, commit `da637c2`).

## 1. Dự án
- Repo: https://github.com/mountain2096/Ridge-media (public). Mạng xã hội dạng feed: React 19 + Vite 8 (`client/`), Express 5 + MongoDB/Mongoose 9 (`server/`), Socket.IO cho realtime.
- Thư mục máy chủ dự án: `C:\Ridge Project` (Windows, PowerShell). Chủ dự án nói tiếng Việt; giao diện app bằng tiếng Việt.
- Chạy: `npm install` → `npm install --prefix client` → tạo `.env` từ `.env.example` → `npm run dev:all` (web :5173, API :5000). API URL của client đọc từ `VITE_API_URL` (mặc định `http://localhost:5000`) qua `client/src/lib/api.js`.
- Kiểm tra: `node --test` (backend), `npm run lint --prefix client`, `npm run build --prefix client`. Chưa có test client.

## 2. Nhánh Git
Chuỗi nhánh (mỗi nhánh tạo từ nhánh trước): `main` → `fix/audit-roadmap` → `feat/ui-redesign` → `feat/realtime-messaging` → **`feat/reaction-list`** (hiện tại). Nhánh mới cho mỗi tính năng, tạo từ nhánh gần nhất. Push bình thường, KHÔNG `--force`. Chưa có PR nào được xác minh.

## 3. Chức năng đã xác minh trong code
Đăng ký/đăng nhập JWT, quên/đổi mật khẩu (chính sách ≥8 ký tự); trang cá nhân (`/profile/:id`, `ProfilePage.jsx`); bài viết (public/friends/private, sửa, xóa mềm, chia sẻ, lưu); feed phân trang 20 bài + nút "Tải thêm bài viết"; reaction 6 loại cho bài/bình luận/tin nhắn; **danh sách người thả cảm xúc cho bài viết** (mới); trả lời bình luận 1 cấp + @mention; story; kết bạn, chặn, tìm người dùng; nhắn tin realtime (typing, "Đã xem"), emoji + nhãn dán; thông báo realtime (Socket.IO); báo cáo + trang Admin (thống kê, hàng đợi kiểm duyệt có điểm ưu tiên); rate limit, CORS allowlist, kiểm tra URL media; script seed dữ liệu demo.

## 4. Trạng thái kiểm tra (cập nhật mỗi vòng)
- `node --test`: 94 pass, 0 fail; client lint và build pass (do Codex báo ở vòng 2, Claude chưa tự chạy lại được vì không cài được gói).
- Chủ dự án đã test bằng mắt modal danh sách cảm xúc: ổn.
- MongoDB từng báo DNS `ETIMEOUT` trên máy chủ dự án ở một phiên cũ; chưa rõ còn không.

## 5. Quy trình làm việc (3 bên)
- **Chủ dự án**: test bằng mắt, chọn tính năng, tự `git push`.
- **Claude (chat)**: đọc repo trên GitHub, chia việc nhỏ, viết prompt cho Codex, review diff sau khi chủ dự án push, cập nhật file này. Claude chỉ đọc được bản đã push và không có quyền ghi.
- **Codex CLI (plugin Ponytail mức Full)**: code, lint, build, test.
- Mẫu làm việc một tính năng: mở `codex` → `/new` → chọn "Use current Git worktree" → dán prompt (Codex tự tạo nhánh) → Codex commit nhỏ, không push → chủ dự án test bằng mắt và `git push -u origin <nhánh>` → Claude review diff → cập nhật handoff.
- Quy tắc prompt cho Codex: nêu rõ file cần sửa; dùng `git add <file cụ thể>`, không `git add .`; không push, không xóa file (chỉ di chuyển); chạy test hẹp khi lặp và test đầy đủ ở cuối; báo cáo dưới ~12 dòng.

## 6. Giới hạn đã biết
Chung: realtime chỉ 1 tiến trình (cần Redis adapter nếu mở rộng); "Đã xem" chỉ chat 1-1; JWT không bị thu hồi khi đăng xuất; chưa có hồ sơ công khai cho khách; chưa có nhãn "đã chỉnh sửa" cho bài; thông báo like chưa gom nhóm; reply chỉ 2 cấp; nhãn dán không tự tải lên, không động; `FeedPage.jsx` còn ~1.250 dòng.
Danh sách cảm xúc (mới):
- Chỉ có cho bài viết; chưa có cho bình luận và tin nhắn.
- Số "N lượt thích" trên bài tính cả người bị khóa hoặc bị chặn, còn cửa sổ danh sách lọc họ ra, nên hai con số có thể lệch.
- Endpoint `GET /api/post/:id/reactions` nạp toàn bộ người thả cảm xúc của bài rồi cắt trang trong bộ nhớ: ổn với quy mô đồ án, không hợp với bài có hàng nghìn cảm xúc.
- Khi bài chưa có cảm xúc, số bình luận trong `post-stats` dịch sang trái (có thể thêm `margin-left: auto`).
- Test mới chỉ có 2: chưa kiểm tra riêng "like cũ còn hiển thị" và giới hạn `limit` tối đa 50.
- Cửa sổ có `role="tablist"` nhưng chưa có `tabpanel`; khi đổi tab danh sách cũ vẫn hiện cùng "Đang tải...".

## 7. Nhật ký các vòng
| Vòng | Việc | Kết quả | Commit |
|---|---|---|---|
| 0 | Claude đọc repo, nối nhánh, kiểm tra nền | Nền sạch: 92 test, lint, build pass | `e64c605` |
| 1 | Dọn working tree: chuyển patch cũ, `_share/`, bản sao `REALTIME_MESSAGING.md` ra `C:\Ridge_backup\2026-11-22`; sửa `AGENTS.md` và ghi chú đầu `docs/STATUS.md` | Sạch, đã push | `8c2b008` |
| 2 | Danh sách người thả cảm xúc cho bài viết: endpoint `GET /api/post/:id/reactions` (lọc chặn/khóa, phân trang), `ReactionListDialog.jsx`, docs | 94 test pass, lint/build pass, test mắt ổn | `a0f8adc`, `6a56d8c`, `da637c2` |

## 8. Việc tiếp theo (chủ dự án chọn)
Ứng viên: danh sách cảm xúc cho bình luận (dùng lại `listReactions` và dialog); cuộn vô hạn thay nút "Tải thêm"; hồ sơ công khai cho khách; thu hồi JWT khi đăng xuất; nhãn "đã chỉnh sửa" cho bài; tách `FeedPage.jsx`; bổ sung test còn thiếu ở mục 6.

## 9. Lưu ý cho agent mới
- `docs/STATUS.md` và `docs/AUDIT.md` là snapshot CŨ; luôn kiểm chứng với code và `git log`.
- Không chạy seed hoặc migration vào database thật: script seed chỉ nên chạy với database có chữ `demo` trong tên.
- Bản lưu ngoài repo ở `C:\Ridge_backup\2026-11-22` (file patch cũ, `_share/`); đừng đưa lại vào repo.
- Không commit `.env`, khóa, mật khẩu hay token.
