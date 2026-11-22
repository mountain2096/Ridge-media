# HANDOFF — Ridge-media

> Dành cho agent mới (Claude, Codex hoặc agent khác) tiếp tục dự án. Đọc cùng `AGENTS.md`. Sau MỖI tính năng xong: cập nhật mục 4, 7 và 8 rồi commit file này.
> Cập nhật lần cuối: 2026-11-22, after comment reaction list (branch `feat/comment-reaction-list`, feature commits `c010ab8`, `a28a27c`, `8fa86f1`).

## 1. Dự án
- Repo: https://github.com/mountain2096/Ridge-media (public). Mạng xã hội dạng feed: React 19 + Vite 8 (`client/`), Express 5 + MongoDB/Mongoose 9 (`server/`), Socket.IO cho realtime.
- Thư mục máy chủ dự án: `C:\Ridge Project` (Windows, PowerShell). Chủ dự án nói tiếng Việt; giao diện app bằng tiếng Việt.
- Chạy: `npm install` → `npm install --prefix client` → tạo `.env` từ `.env.example` → `npm run dev:all` (web :5173, API :5000). API URL của client đọc từ `VITE_API_URL` (mặc định `http://localhost:5000`) qua `client/src/lib/api.js`.
- Kiểm tra: `node --test` (backend), `npm run lint --prefix client`, `npm run build --prefix client`. Chưa có test client.

## 2. Nhánh Git
Chuỗi nhánh (mỗi nhánh tạo từ nhánh trước): `main` → `fix/audit-roadmap` → `feat/ui-redesign` → `feat/realtime-messaging` → **`feat/comment-reaction-list`** (hiện tại). Nhánh mới cho mỗi tính năng, tạo từ nhánh gần nhất. Push bình thường, KHÔNG `--force`. Chưa có PR nào được xác minh.

## 3. Chức năng đã xác minh trong code
Đăng ký/đăng nhập JWT, quên/đổi mật khẩu (chính sách ≥8 ký tự); trang cá nhân (`/profile/:id`, `ProfilePage.jsx`); bài viết (public/friends/private, sửa, xóa mềm, chia sẻ, lưu); feed phân trang 20 bài + nút "Tải thêm bài viết"; reaction 6 loại cho bài/bình luận/tin nhắn; **reaction lists for posts and comments** (mới); trả lời bình luận 1 cấp + @mention; story; kết bạn, chặn, tìm người dùng; nhắn tin realtime (typing, "Đã xem"), emoji + nhãn dán; thông báo realtime (Socket.IO); báo cáo + trang Admin (thống kê, hàng đợi kiểm duyệt có điểm ưu tiên); rate limit, CORS allowlist, kiểm tra URL media; script seed dữ liệu demo.

## 4. Test status (update each round)
- `node --test`: 96 passed, 0 failed.
- `npm run lint --prefix client`: passed.
- `npm run build --prefix client`: passed.
- No browser or live MongoDB verification was run this round.

## 5. Quy trình làm việc (3 bên)
- **Chủ dự án**: test bằng mắt, chọn tính năng, tự `git push`.
- **Claude (chat)**: đọc repo trên GitHub, chia việc nhỏ, viết prompt cho Codex, review diff sau khi chủ dự án push, cập nhật file này. Claude chỉ đọc được bản đã push và không có quyền ghi.
- **Codex CLI (plugin Ponytail mức Full)**: code, lint, build, test.
- Mẫu làm việc một tính năng: mở `codex` → `/new` → chọn "Use current Git worktree" → dán prompt (Codex tự tạo nhánh) → Codex commit nhỏ, không push → chủ dự án test bằng mắt và `git push -u origin <nhánh>` → Claude review diff → cập nhật handoff.
- Quy tắc prompt cho Codex: nêu rõ file cần sửa; dùng `git add <file cụ thể>`, không `git add .`; không push, không xóa file (chỉ di chuyển); chạy test hẹp khi lặp và test đầy đủ ở cuối; báo cáo dưới ~12 dòng.

## 6. Known limitations
General: realtime uses one process (Redis adapter needed to scale); read receipts support only one-to-one chat; JWTs are not revoked on logout; guest profiles are unavailable; posts have no edited label; like notifications are not grouped; replies are limited to two levels; stickers do not upload or animate; `FeedPage.jsx` remains about 1,250 lines.

Reactions: aggregate counters can include blocked or locked users that the list filters; the list endpoint loads all reactions before paging in memory, suitable for this project but not posts with thousands of reactions; tests still do not specifically cover legacy-like display or the maximum `limit` of 50; the dialog has a `tablist` but no `tabpanel`.

Done this round: reaction lists now cover comments as well as posts; tab changes clear old rows while loading; the comment count stays right-aligned when a post has no reactions.

## 7. Round log
| Round | Work | Result | Commit |
|---|---|---|---|
| 0 | Claude reviewed repository, branch and baseline | Baseline: 92 tests, lint and build passed | `e64c605` |
| 1 | Cleaned worktree and updated project guide/status | Clean; pushed | `8c2b008` |
| 2 | Post reaction list API, dialog and docs | 94 tests passed; lint/build passed; visually checked | `a0f8adc`, `6a56d8c`, `da637c2` |
| 3 | Comment reaction list API and UI; fixed Mongoose subdocument normalization with real-document regression coverage; documented both endpoints | 96 tests passed; lint/build passed | `c010ab8`, `a28a27c`, `8fa86f1` |

## 8. Next candidates (owner chooses)
Infinite scrolling instead of the "Load more" button; guest profiles; JWT revocation on logout; edited-post labels; splitting `FeedPage.jsx`; remaining test gaps listed in section 6.

## 9. Lưu ý cho agent mới
- `docs/STATUS.md` và `docs/AUDIT.md` là snapshot CŨ; luôn kiểm chứng với code và `git log`.
- Không chạy seed hoặc migration vào database thật: script seed chỉ nên chạy với database có chữ `demo` trong tên.
- Bản lưu ngoài repo ở `C:\Ridge_backup\2026-11-22` (file patch cũ, `_share/`); đừng đưa lại vào repo.
- Không commit `.env`, khóa, mật khẩu hay token.
