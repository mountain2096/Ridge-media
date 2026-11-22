Snapshot cũ (2026-11-20, nhánh feat/ui-redesign, commit 60ac493); xem AGENTS.md và git log để biết trạng thái mới nhất.
# Ridge codebase status

Audit date: 2026-11-20  
Branch: `feat/ui-redesign` (`origin/feat/ui-redesign`)  
Scope: read-only code audit plus requested test, lint, and build commands. No source files were changed, and nothing was staged or committed.

## Environment

- `git branch --show-current`: `feat/ui-redesign`.
- Before this audit document was created, `git status --short --branch` was clean and the branch tracked `origin/feat/ui-redesign`. After creating this file, the only worktree change is the untracked `docs/STATUS.md`.
- The latest 15 commits were read. The current tip is `60ac493 fix(ui): spacing between profile columns`.
- Backend dependencies are declared in root `package.json`; `server/package.json` does not exist. Tests are in `server/test/*.test.js` and use Node's built-in test runner.
- `client/package.json` defines `lint` as `eslint .` and `build` as `vite build`.
- `.env` exists, is ignored by Git, and is not tracked. Key names and whether values are present were checked without printing values. `.env.example` is tracked. A tracked-file scan for common cloud/API token formats and private-key headers returned no matches; this pattern scan is not a comprehensive secret-history scan.
- Test cases stub database model calls; no MongoDB connection or configured credentials were needed for the test run. Runtime database connectivity was not tested.
- The client calls `http://localhost:5000` directly in multiple components; deployment therefore needs that API origin or a code/configuration change.

## Test results

Command: `node --test` (run from repository root)

| Result | Count |
|---|---:|
| Passed | 16 |
| Failed | 0 |
| Skipped | 0 |
| Cancelled | 0 |
| Total | 16 |

Tests are unit-style tests with model methods replaced by stubs. They cover feed filtering/pagination, block restrictions on messaging, auth middleware/admin authorization, schema constraints, reports/admin actions, sharing, registration/login/password changes, soft deletion, and locked-account search filtering. They do not prove database-backed integration or exercise every audited use case.

## Build and lint

- `npm.cmd run lint` from `client`: passed; ESLint reported no warnings or errors.
- `npm.cmd run build` from `client`: passed; Vite transformed 37 modules and emitted the production bundle. No build warnings or errors were reported.
- Calling `npm` directly in PowerShell first failed because the system execution policy blocks `npm.ps1`; invoking the Windows `npm.cmd` shim ran both requested scripts successfully.
- The build output is generated under the client build directory and is ignored; Git remained clean after the commands.

## UC status table

Statuses describe code paths found in the current branch, not an end-to-end production run. `Working` means the route/controller/model/UI path exists and the reviewed code supports the described flow. Test coverage is separately described above.

| UC | Use case | Status | Current code evidence and reason |
|---|---|---|---|
| UC01 | Registration | Working | `server/routes/auth.js`, `server/controllers/authControllers.js`, `server/models/User.js`, `client/src/App.jsx`; registration validates password confirmation and password strength, persists a user, and the auth form submits these fields. |
| UC02 | Login | Working | `server/routes/auth.js`, `server/controllers/authControllers.js`, `server/models/User.js`, `client/src/App.jsx`; login checks credentials/locked status and returns a JWT used by the client. |
| UC03 | Logout | Partially working | `client/src/AppLayout.jsx`, `server/routes/auth.js`, `server/controllers/authControllers.js`; client removes its local token, but there is no server-side token revocation/logout endpoint. |
| UC04 | View profile | Partially working | `server/routes/user.js`, `server/controllers/userControllers.js`, `server/routes/post.js`, `server/controllers/postControllers.js`, `server/models/User.js`, `server/models/Post.js`, `client/src/pages/ProfilePage.jsx`; profile and privacy-filtered posts are shown, but profile routes and APIs require authentication, so public guest viewing is unavailable. |
| UC05 | Update profile information | Working | `server/routes/user.js`, `server/controllers/userControllers.js`, `server/models/User.js`, `client/src/components/ProfileSettings.jsx`; profile fields, birth date and uploaded avatar/cover are editable with server-side type/date/bio checks. |
| UC06 | Change password | Working | `server/routes/auth.js`, `server/controllers/authControllers.js`, `server/models/User.js`, `client/src/components/ProfileSettings.jsx`; authenticated change checks current password, confirmation and strength. |
| UC07 | Manage blocks | Working | `server/routes/user.js`, `server/controllers/userControllers.js`, `server/models/User.js`, `client/src/components/ProfileSettings.jsx`; block/unblock and blocked-list UI exist, with relationships, pending requests and conversations adjusted on block. |
| UC08 | Create post | Partially working | `server/routes/post.js`, `server/controllers/postControllers.js`, `server/models/Post.js`, `server/routes/upload.js`, `client/src/pages/FeedPage.jsx`, `client/src/lib/uploadMedia.js`; privacy/status and upload MIME/size handling exist, but create/update accept arbitrary media URL strings when called directly. |
| UC09 | Edit post | Partially working | `server/routes/post.js`, `server/controllers/postControllers.js`, `server/models/Post.js`, `client/src/pages/FeedPage.jsx`; owner can edit content/media, but no edited indicator/timestamp is stored or displayed. |
| UC10 | Delete post | Working | `server/routes/post.js`, `server/controllers/postControllers.js`, `server/models/Post.js`, `client/src/pages/FeedPage.jsx`; owner/admin soft-delete and shares of a deleted source are also soft-deleted. |
| UC11 | Like/unlike | Partially working | `server/routes/post.js`, `server/controllers/postControllers.js`, `server/models/Post.js`, `server/models/Notification.js`, `client/src/pages/FeedPage.jsx`; like/unlike and notifications are present, but notifications are not grouped into a summary. |
| UC12 | Comment | Working | `server/routes/comment.js`, `server/controllers/commentControllers.js`, `server/models/Comment.js`, `client/src/pages/FeedPage.jsx`, `client/src/pages/ProfilePage.jsx`; create/list/edit are wired with authentication and ownership checks. |
| UC13 | Delete comment | Working | `server/routes/comment.js`, `server/controllers/commentControllers.js`, `server/models/Comment.js`, `client/src/pages/FeedPage.jsx`; comment author, post owner and admin can soft-delete; deleted comments are filtered from reads. |
| UC14 | Share post | Working | `server/routes/post.js`, `server/controllers/postControllers.js`, `server/models/Post.js`, `server/models/Notification.js`, `client/src/pages/FeedPage.jsx`, `client/src/pages/ProfilePage.jsx`; share-reference posts and notifications are created, with source privacy/block/deletion checks in read paths. |
| UC15 | Report content | Working | `server/routes/report.js`, `server/controllers/reportControllers.js`, `server/models/Report.js`, `server/models/Post.js`, `server/models/Comment.js`, `client/src/pages/FeedPage.jsx`; active targets are validated, duplicate reports handled, and feed offers report actions. |
| UC16 | Search users | Partially working | `server/routes/user.js`, `server/controllers/userControllers.js`, `server/models/User.js`, `client/src/AppLayout.jsx`; query is escaped and blocked/locked users are excluded, but route and search UI are authenticated only. |
| UC17 | Manage friend requests | Working | `server/routes/friend.js`, `server/controllers/friendControllers.js`, `server/models/FriendRequest.js`, `server/models/User.js`, `client/src/pages/FeedPage.jsx`, `client/src/pages/ProfilePage.jsx`; send/receive/accept/reject/unfriend paths and pending-request uniqueness are implemented. |
| UC18 | View notifications | Working | `server/routes/notification.js`, `server/controllers/notificationController.js`, `server/models/Notification.js`, `client/src/AppLayout.jsx`; authenticated notification listing/read state and notification types are rendered in the app shell. |
| UC19 | One-to-one messaging | Partially working | `server/routes/message.js`, `server/controllers/messageCotrollers.js`, `server/models/Conversation.js`, `server/models/Message.js`, `client/src/components/MessagesView.jsx`; conversation, send/read and block checks exist, while client updates by polling rather than real-time delivery. |
| UC20 | Admin user management | Working | `server/routes/admin.js`, `server/controllers/adminControllers.js`, `server/models/User.js`, `client/src/components/AdminPanel.jsx`; routes require both auth and admin middleware, and UI supports listing/locking/unlocking. |
| UC21 | Admin report review | Working | `server/routes/admin.js`, `server/controllers/adminControllers.js`, `server/models/Report.js`, `client/src/components/AdminPanel.jsx`; pending reports can be reviewed/actioned with reviewer metadata. |
| UC22 | News feed | Working | `server/routes/post.js`, `server/controllers/postControllers.js`, `server/models/Post.js`, `server/models/User.js`, `client/src/pages/FeedPage.jsx`; active status, privacy, both block directions, share-source visibility and bounded pagination are handled. |

No use case was marked `Broken`, `Not implemented`, or `Unverified`: all 22 have corresponding current code paths that could be inspected. This is a static code audit; behavior requiring live MongoDB, mail delivery, uploaded media serving, or browser interaction remains outside verification.

## UI redesign progress

The new news-feed visual language is based on `client/src/newsfeed.css` and related overrides in `client/src/App.css`. “New” means the screen uses the feed palette/cards and responsive application shell; it does not imply every interaction was browser-tested.

| Page/component | Style status | Notes |
|---|---|---|
| `client/src/pages/FeedPage.jsx` | New | Main feed, friends/connections, saved, reels, and activity sections share the redesigned feed UI. |
| `client/src/pages/ProfilePage.jsx` | New | Dedicated profile styling in `client/src/profile.css`, with feed-style post cards. |
| `client/src/AppLayout.jsx` | New | Redesigned application shell, navigation, header, and notification surfaces. |
| `client/src/components/ProfileSettings.jsx` | New | Settings cards and forms use the refreshed card system. |
| `client/src/components/MessagesView.jsx` | Mixed/old | Runs inside the new shell but retains older message-view structure and styling; redesign remains. |
| `client/src/components/AdminPanel.jsx` | Mixed/old | Runs inside the new shell but uses older connection/admin row patterns; redesign remains. |
| `client/src/App.jsx` (`AuthPage`) | Old | Authentication screen retains the original split welcome/form styling. |
| `client/src/pages/ForgotPasswordPage.jsx` | Old | Uses the auth form presentation. |
| `client/src/pages/ResetPasswordPage.jsx` | Old | Uses the auth form presentation. |
| `client/src/components/AppErrorBoundary.jsx` | No dedicated redesign | Error fallback is a minimal generic message rather than a designed recovery screen. |
| `client/src/lib/uploadMedia.js` | Not a UI | Upload helper; no visual styling. |

Frontend source inventory: pages `FeedPage.jsx`, `ForgotPasswordPage.jsx`, `ProfilePage.jsx`, `ResetPasswordPage.jsx`; components `AdminPanel.jsx`, `AppErrorBoundary.jsx`, `MessagesView.jsx`, `ProfileSettings.jsx`; application-level views `App.jsx`, `AppLayout.jsx`. Styling/entry files are `App.css`, `index.css`, `newsfeed.css`, and `profile.css`; `main.jsx` mounts the app. There are no other page/component files under `client/src` at audit time.

## Issues found

Sorted by severity. Suggested fixes are recommendations only; no source changes were made.

### High

- No confirmed high-severity issue found in this static review.

### Medium

- `server/controllers/postControllers.js` (`createPost`, `updatePost`) and `server/controllers/userControllers.js` (`updateMe`): media fields are only checked as strings, not constrained to server-upload URLs or safe schemes. Validate URLs against allowed local upload paths or store media IDs returned by the upload endpoint; apply checks to avatar and cover fields too.
- `server/server.js`: `cors()` allows every origin by default. Set an explicit production origin allowlist from configuration and keep local development origins deliberate.
- `server/controllers/*.js`: many catch blocks return `err.message` directly to clients. Return a generic public error and log diagnostic details server-side to avoid exposing database/internal messages.
- `client/src/components/AdminPanel.jsx`: initial user/report loads have an error state but no explicit loading state; empty arrays can look like “no reports/users” before the request finishes. Add loading and retry states.
- `client/src/components/ProfileSettings.jsx`: blocked-user list has error/empty handling but no distinct loading state. Show loading until the initial request resolves.
- `server/controllers/authControllers.js`, `server/routes/auth.js`: public login and password-reset endpoints have no visible rate limiting in the reviewed route/controller setup. Add per-IP/account throttling and generic reset responses if abuse resistance is required for deployment.

### Low

- `client/src/AppLayout.jsx`: logout removes the browser token only; the JWT remains usable until expiry. Add revocation/short-lived access-token strategy if immediate logout invalidation is required.
- `server/controllers/postControllers.js`, `client/src/pages/FeedPage.jsx`, `client/src/pages/ProfilePage.jsx`: edited posts are not labeled. Record an edit timestamp/flag and show an “edited” marker if that product behavior is desired.
- `client/src/components/MessagesView.jsx`: message refresh uses a 10-second polling interval. Consider a push transport if lower latency is a requirement.
- `client/src/App.jsx`, `client/src/pages/ForgotPasswordPage.jsx`, `client/src/pages/ResetPasswordPage.jsx`: auth and recovery screens remain on the old visual style; include them in the remaining redesign work if design coverage should be consistent.

## Recommended next steps

1. Enforce media URL/scheme policy on post and profile updates; add tests for direct API submissions that bypass the uploader.
2. Restrict CORS to configured client origins in deployed environments.
3. Stop returning raw internal exception messages from API handlers; log details on the server.
4. Add rate limiting for login, registration, and password-reset request endpoints.
5. Add explicit loading/retry states to admin and blocked-user views.
6. Decide whether logout needs immediate server-side token revocation and implement the selected session model.
7. Add integration verification against a disposable MongoDB and configured mail service; the current 16 tests stub database access.
8. Continue UI redesign on messaging, admin, authentication, and password recovery screens.
