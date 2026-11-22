# HANDOFF — Ridge-media

> For a new agent (Claude, Codex, or another agent) continuing the project. Read together with `AGENTS.md`. After EVERY finished feature: update sections 4, 7 and 8, then commit this file.
> Last updated: 2026-11-22, after Round 5 (branch `test/reaction-list-coverage`, commit `020960d`).

## 1. Project
- Repo: https://github.com/mountain2096/Ridge-media (public). A social feed app: React 19 + Vite 8 (`client/`), Express 5 + MongoDB/Mongoose 9 (`server/`), Socket.IO for realtime.
- Project directory on the owner's machine: `C:\Ridge Project` (Windows, PowerShell). The project owner speaks Vietnamese; the app UI is in Vietnamese.
- Run: `npm install` → `npm install --prefix client` → create `.env` from `.env.example` → `npm run dev:all` (web :5173, API :5000). The client reads its API URL from `VITE_API_URL` (default `http://localhost:5000`) via `client/src/lib/api.js`.
- Checks: `node --test` (backend), `npm run lint --prefix client`, `npm run build --prefix client`. There are no client tests yet.

## 2. Git branches
Branch chain (each branch created from the previous one): `main` → `fix/audit-roadmap` → `feat/ui-redesign` → `feat/realtime-messaging` → `feat/comment-reaction-list` → `feat/edited-post-label` → `docs/agents-branch-sync` → **`test/reaction-list-coverage`** (current). Branch `docs/agents-branch-sync` was created from `feat/edited-post-label`; the test branch was created from that branch. Create each new feature branch from the nearest preceding branch. Push normally; never use `--force`. No PR has been verified.

## 3. Features verified in code
JWT sign-up and login; password reset and change (minimum 8 characters); profile page (`/profile/:id`, `ProfilePage.jsx`); public, friends-only, or private posts that can be edited, soft-deleted, shared, and saved; paginated feed of 20 posts with a "Tải thêm bài viết" button; 6 reaction types for posts, comments, and messages; reaction lists for posts and comments; one-level comment replies and @mentions; stories; friend requests, blocking, and user search; realtime messaging (typing, "Đã xem"), emoji, and stickers; realtime notifications (Socket.IO); reports and admin page (statistics, moderation queue with priority scores); rate limits, CORS allowlist, media URL validation; sample-data script.

## 4. Test status (update each round)
- The project owner manually checked the reaction list dialog in a browser after the load-more fix.
- Round 5: `node --test` passed 102 tests; only edge cases for reaction lists were added (client lint/build not run; no client changes); the post-edit flow has not been verified in a browser or against a live MongoDB instance.
- The PUT response merge fix passed client lint and build; code review confirmed it preserves the author, menu, and shared-post data, and applies the edited label on the feed and profile page.
- `node --test` was not rerun after the client-only fix.

## 5. Workflow (three parties)
- **Project owner**: manually test, choose features, and run `git push` themselves.
- **Claude (chat)**: read the repo on GitHub, break work into small tasks, write prompts for Codex, review diffs after the owner pushes, and update this file. Claude can only read the pushed version and cannot write.
- **Codex CLI (Ponytail plugin, Full level)**: code, lint, build, and test.
- One-feature workflow: open `codex` → `/new` → select "Use current Git worktree" → paste the prompt (Codex creates the branch) → Codex makes a small commit, without pushing → project owner manually tests and runs `git push -u origin <branch>` → Claude reviews the diff → update the handoff.
- Codex prompt rules: name the files to change; use `git add <specific file>`, never `git add .`; do not push or delete files (move only); run focused tests while iterating and the full checks at the end; report in about 12 lines or fewer.

## 6. Known limitations
General: realtime currently runs in a single process (a Redis adapter is needed to scale); read receipts apply only to two-person conversations; JWTs are not revoked on logout; no guest profile page; posts edited before this change have no edited label because they lack `editedAt`; like notifications are not grouped; comment replies are limited to two levels; stickers are not uploaded or animated; `FeedPage.jsx` is still about 1,250 lines.

Reaction lists: the total count may include blocked or deactivated users while the list filters them; the endpoint loads all reactions into memory before pagination, which suits the current project but not posts with thousands of reactions; `limit=0` falls back to 30 but `limit=-5` is clamped to 1 (the `parseInt || 30` behavior); tests assert this current behavior, so update them if handling is standardized; the dialog has a `tablist` but no `tabpanel`.

Completed in the previous round: reaction lists work for both comments and posts; switching tabs clears old rows while loading; the comment count stays at the far right when a post has no reactions. Round 4 retained visible rows while loading more.

## 7. Round log
| Round | Work | Result | Commit |
|---|---|---|---|
| 0 | Claude reviewed the repository, branches, and initial state | Initially: 92 tests; lint and build passed | `e64c605` |
| 1 | Cleaned up the worktree and updated project guidance/status | Worktree clean; pushed | `8c2b008` |
| 2 | API, post reaction-list dialog, and documentation | 94 tests; lint/build passed; visually checked | `a0f8adc`, `6a56d8c`, `da637c2` |
| 3 | API and comment reaction-list UI; fixed Mongoose subdocument normalization, added regression tests using real documents, and documented both endpoints | 96 tests; lint/build passed | `c010ab8`, `a28a27c`, `8fa86f1`, `7bbe25c`, `5f5af78` |
| 4 | Retained reaction lists while loading more; saved `editedAt` when content/media actually changes and showed the post label; preserved author/shared-post data when merging edit responses on the feed and profile page | 98 tests; lint/build passed; merge fix reviewed in code | `1d957c2`, `1325b25`, `9212f66`, `aec963e`, `d3cc2e2`, `055d78d` |
| 5 | Updated AGENTS.md for the current branch; added reaction-list tests (legacy likes, limit clamping, empty/out-of-range pages) | 102 tests passing; docs and test changes only | `861f922`, `9cf576d`, `020960d` |

## 8. Possible next work (project owner chooses)
Infinite scroll instead of the "Tải thêm bài viết" button; guest profile page; revoke JWTs on logout; split up `FeedPage.jsx`.

## 9. Notes for a new agent
- `docs/STATUS.md` and `docs/AUDIT.md` are old snapshots; always verify against the code and `git log`.
- Do not run seed scripts or migrations against a real database: the seed script should only run against a database whose name contains `demo`.
- Backup outside the repo: `C:\Ridge_backup\2026-11-22` (old patch file, `_share/`); do not bring it back into the repo.
- Do not commit `.env`, keys, passwords, or tokens.
- Docs language: this file and AGENTS.md are in English; write Codex prompts in English.
