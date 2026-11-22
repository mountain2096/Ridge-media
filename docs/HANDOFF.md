# HANDOFF — Ridge-media

> For a new agent (Claude, Codex, or another agent) continuing the project. Read together with `AGENTS.md`. After EVERY finished feature: update sections 4, 7 and 8, then commit this file.
> Last updated: 2026-11-22, after Round 11 (branch `fix/guest-profile-only`).

## 1. Project
- Repo: https://github.com/mountain2096/Ridge-media (public). A social feed app: React 19 + Vite 8 (`client/`), Express 5 + MongoDB/Mongoose 9 (`server/`), Socket.IO for realtime.
- Project directory on the owner's machine: `C:\Ridge Project` (Windows, PowerShell). The project owner speaks Vietnamese; the app UI is in Vietnamese.
- Run: `npm install` → `npm install --prefix client` → create `.env` from `.env.example` → `npm run dev:all` (web :5173, API :5000). The client reads its API URL from `VITE_API_URL` (default `http://localhost:5000`) via `client/src/lib/api.js`.
- Checks: `node --test` (backend), `npm run lint --prefix client`, `npm run build --prefix client`. There are no client tests yet.

## 2. Git branches
Branch chain (each branch created from the previous one): `main` → `fix/audit-roadmap` → `feat/ui-redesign` → `feat/realtime-messaging` → `feat/comment-reaction-list` → `feat/edited-post-label` → `docs/agents-branch-sync` → `test/reaction-list-coverage` → `feat/jwt-revocation` → `fix/client-401-signout` → `feat/guest-public-api` → `feat/guest-ui` → `fix/guest-routes-layout` → **`fix/guest-profile-only`** (current). Branch `docs/agents-branch-sync` was created from `feat/edited-post-label`; the test branch was created from that branch; the `feat/guest-public-api` branch was created from `fix/client-401-signout`; `feat/guest-ui` was created from that branch; `fix/guest-routes-layout` was created from `feat/guest-ui`; this branch was created from `fix/guest-routes-layout`. Create each new feature branch from the nearest preceding branch. Push normally; never use `--force`. No PR has been verified.

## 3. Features verified in code
JWT sign-up and login; password reset and change (minimum 8 characters); profile page (`/profile/:id`, `ProfilePage.jsx`); guests can view only a profile and its public posts via `/api/public/users/:id` and `/api/public/users/:id/posts`, with a login gate after 8 seconds; public, friends-only, or private posts that can be edited, soft-deleted, shared, and saved; paginated feed of 20 posts with a "Tải thêm bài viết" button; 6 reaction types for posts, comments, and messages; reaction lists for posts and comments; one-level comment replies and @mentions; stories; friend requests, blocking, and user search; realtime messaging (typing, "Đã xem"), emoji, and stickers; realtime notifications (Socket.IO); reports and admin page (statistics, moderation queue with priority scores); rate limits, CORS allowlist, media URL validation; sample-data script.

## 4. Test status (update each round)
- The project owner manually checked the reaction list dialog in a browser after the load-more fix.
- Round 5: `node --test` passed 102 tests; only edge cases for reaction lists were added (client lint/build not run; no client changes); the post-edit flow has not been verified in a browser or against a live MongoDB instance.
- Round 6: `node --test` passed 107 tests; client lint and build passed. The logout flow was not verified in a browser or against live MongoDB.
- The PUT response merge fix passed client lint and build; code review confirmed it preserves the author, menu, and shared-post data, and applies the edited label on the feed and profile page.
- `node --test` was not rerun after the client-only fix.
- Round 7: client lint and build passed. The project owner manually confirmed in two tabs that logging out in one tab makes the other tab's token invalid. The new automatic sign-out on 401 has not yet been verified in a browser.
- Round 8: `node --test` passed 112 tests (up from 107); client was not touched; public endpoints were not verified against a live MongoDB instance.
- Round 9: client lint and build passed; guest UI was not verified in a browser or against a live MongoDB instance.
- Round 10: client lint and build passed; route behavior was verified by reading the route tree only, not in a browser.
- Round 11: `node --test` passed 113 tests; client lint and build passed. Guest route and login-gate behavior was not verified in a browser or against a live MongoDB instance.

## 5. Workflow (three parties)
- **Project owner**: manually test and choose features.
- **Claude (chat)**: read the repo on GitHub, break work into small tasks, write prompts for Codex, review the diff after Codex pushes, and update this file. Claude can only read the pushed version and cannot write.
- **Codex CLI (Ponytail plugin, Full level)**: code, lint, build, and test.
- One-feature workflow: open `codex` → `/new` → select "Use current Git worktree" → paste the prompt (Codex creates the branch) → Codex makes a small commit and pushes its feature branch with `git push -u origin <branch>` → project owner manually tests → Claude reviews the pushed diff → update the handoff.
- Codex prompt rules: name the files to change; use `git add <specific file>`, never `git add .`; push the branch normally at the end; never force-push or delete files (move only); run focused tests while iterating and the full checks at the end; report in about 12 lines or fewer.

## 6. Known limitations
Only `AppLayout`'s profile load and heartbeat handle 401 responses. Other fetch calls still show errors until the next heartbeat, at most 60 seconds later or when the tab regains focus.

General: realtime currently runs in a single process (a Redis adapter is needed to scale); read receipts apply only to two-person conversations; logout invalidates all of the user's devices; `changePassword` does not yet revoke tokens; guests will not see stories, comments, or reaction lists by design; the public feed endpoint was removed; the guest login gate is a client-side nudge only and can be bypassed by calling `/api/public/*` directly; guest views duplicate some `PostCard` markup, so UI changes there may need mirroring in `GuestPostCard`; a stale guest token routes through `AppLayout` and signs the user out to the login screen; posts edited before this change have no edited label because they lack `editedAt`; like notifications are not grouped; comment replies are limited to two levels; stickers are not uploaded or animated; `FeedPage.jsx` is still about 1,250 lines.

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
| 6 | Added JWT token-version revocation on logout and password reset; added client logout call and backend coverage | 107 tests passing; lint/build passed; logout not verified in a browser or against live MongoDB | `f638a91`, `c531925`, `7eef642` |
| 7 | Sign out locally when profile load or heartbeat receives 401 | Client lint and build passed; automatic sign-out not verified in a browser | `a3a98c9` |
| 8 | Add public read-only guest profile and post endpoints with locked-author filtering and reaction counts | 112 tests passed; client untouched; not verified against live MongoDB | `476ef96`, `92afb9a` |
| 9 | Add read-only guest feed and profile UI with token-based routing | Client lint and build passed; guest UI not verified in a browser or against a live MongoDB | `7e18cd3`, `ad31135`, `adff8b4`, `f732ad6`, `a961d3a` |
| 11 | Restrict guest access to profiles, remove public feed endpoint, and add blocking login gate after 8 seconds | 113 tests; lint/build passed; not verified in a browser or against live MongoDB | `2a4195a`, `bbf10f5` |

## 8. Possible next work (project owner chooses)
Infinite scroll instead of the "Tải thêm bài viết" button; split up `FeedPage.jsx`.

## 9. Notes for a new agent
- `docs/STATUS.md` and `docs/AUDIT.md` are old snapshots; always verify against the code and `git log`.
- Do not run seed scripts or migrations against a real database: the seed script should only run against a database whose name contains `demo`.
- Backup outside the repo: `C:\Ridge_backup\2026-11-22` (old patch file, `_share/`); do not bring it back into the repo.
- Do not commit `.env`, keys, passwords, or tokens.
- Docs language: this file and AGENTS.md are in English; write Codex prompts in English.
