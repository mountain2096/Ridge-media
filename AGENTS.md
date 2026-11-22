# Ridge project guide

Read this file before changing the project. Keep API and backend behavior intact when a task is limited to UI work. If an instruction below conflicts with a specific user request, follow the user's request.

## Project and technology

Ridge is a social feed application. It has a React single-page client and an Express API backed by MongoDB.

- Client: React 19, React Router 7, Vite 8, plain CSS, ESLint.
- Server: Node.js, Express 5, Mongoose 9, JWT authentication, Multer local uploads, Nodemailer for password reset email.
- Persistence: MongoDB. Local media uploads go under `server/uploads` (30 MB limit per the README).

## Repository map

- `client/src/App.jsx`: authentication and route definitions.
- `client/src/AppLayout.jsx`: authenticated application frame, navigation, notifications, counts, and outlet context.
- `client/src/pages/`: feed, profile, password reset, and other page views.
- `client/src/components/`: profile settings, messaging, admin, and reusable UI.
- `client/src/newsfeed.css`, `App.css`, `profile.css`: application styles and design tokens.
- `client/src/lib/`: client helpers such as media upload.
- `server/server.js`: Express startup and route mounting.
- `server/routes/`, `controllers/`, `models/`, `middleware/`, `config/`: API routes, handlers, schemas, auth, and database setup.
- `server/scripts/`: maintenance and migration scripts. Check their target database before running them.
- `server/test/`: Node built-in test runner tests.
- `docs/AUDIT.md`: audited use cases and known functional limitations. It is an audit snapshot, so verify against current code before treating every note as current.
- `docs/CHANGES.md`: audit-roadmap implementation notes.
- `docs/design/newsfeed-reference.html`: visual reference only; it contains sample content and is not application code.

## Install and run

Run commands from the repository root unless noted.

1. Install server/root dependencies: `npm install`
2. Install client dependencies: `npm install --prefix client`
3. Create the root `.env` using `.env.example` as a template and configure the values for your machine. `.env` is ignored by Git and is not tracked; a new machine must create its own `.env` from `.env.example`.
4. Start both apps in one terminal with `npm run dev:all`, then open `http://localhost:5173`.

You can also use two terminals: `npm run dev` from the root starts the API; `npm run dev:client` from the root starts Vite. `npm start` starts the API without nodemon. The backend defaults to port 5000; Vite defaults to 5173 and may select another free port if 5173 is occupied. The client reads the API URL from `VITE_API_URL` via `client/src/lib/api.js` (default `http://localhost:5000`).

Useful checks:

- Client lint: `npm run lint --prefix client`
- Client production build: `npm run build --prefix client`
- Backend tests: `node --test` (the root package has no dedicated test script; tests are under `server/test/`).
- Client tests: no client test script or client test suite was found; status may change.

## Environment variable names

The names in `.env.example` are `PORT`, `MONGO_URI`, `JWT_SECRET`, `EMAIL_USER`, `EMAIL_PASS`, and `CLIENT_URL`. Do not copy credentials or values into documentation. `.env` is not in Git; create it from `.env.example` on every new machine. The email variables are used by password-reset email flow (README).

## Work rules

- Current task branch: check `git branch --show-current` and docs/HANDOFF.md section 2.
- Each feature gets a new branch created from main (the earlier branch chain was merged by PR #3 on 2026-11-22).
- Keep changes focused and make small commits with descriptive messages.
- Run client lint and build before committing UI/client changes. Run the relevant backend tests when changing server behavior.
- Never commit `.env`, API keys, passwords, or tokens. Do not run `git push --force`.
- Inspect `git status` and the staged diff before committing. Do not sweep unrelated pre-existing edits into a commit.
- Preserve existing data/API behavior for UI-only requests. Do not run a migration against a real database without explicit direction.

## UI direction

Use `docs/design/newsfeed-reference.html` as the visual reference for the news feed: Inter/system sans-serif, cool gray page background, white rounded cards, ink/muted/accent/danger/like colors, clear focus rings, and responsive layouts. The reference is a static mockup with sample data, not a source of product content. The client has corresponding `--news-*` variables in `client/src/newsfeed.css`. Keep the existing inline SVG stroke icon style; do not introduce emoji in place of icons. Inter can fall back to the system font when unavailable.

## Work completed and current state

Latest handoff (branch chain, per-feature log, known limits, workflow): docs/HANDOFF.md. Update it after every finished feature.

`docs/AUDIT.md` describes 22 audited use cases. At the time of that document, most API flows were implemented; several are explicitly partial, including JWT logout revocation, public guest profiles/search, edited-post labels, grouped like notifications, and some direct media URL validation. Read the audit table for the detailed status; verify current handlers before changing them.

Current task branch: check `git branch --show-current` and docs/HANDOFF.md section 2.

Recent committed UI work (verified from `git log`):

- Feed redesign and responsive layout, composer, cards, side rail, and menu: commits including `974b10a`, `2f578d8`, `5775fc0`, `9fda3b5`, `239d3b9`.
- Post menu icons/actions and role-specific options: `239d3b9`.
- Liked heart fill and motion: `9604d59`.
- Comment list and inline editing: `ca93c59`.
- Settings cards and forms: `f4a5bbc`.
- Comment action target sizing: `be19459`, `2f4fb79`.
- Other recent commits include unread counts (`fb5e18a`) and user-search handling (`1e353aa`).

The latest work added an authenticated `AppLayout`, a profile page with profile/post data, profile links from feed and messages, profile-related CSS, and server query/response changes supporting profile posts and relationships. The auth/layout routes were reorganized in `App.jsx`. During browser verification a blank-screen redirect loop was reproduced: an index route inside the protected pathless route redirected `/` to `/feed`, and unauthenticated `RequireAuth` redirected it back to `/`. That protected index route was removed; unauthenticated `/` now renders the auth screen and `AuthRoute` sends an authenticated visit to `/feed`.

Verification at the time of this guide: `npm run lint --prefix client` passed; `npm run build --prefix client` passed; `node --test` passed all 92 backend tests. Browser verification with Edge DevTools confirmed that `/` renders the auth form after the redirect fix. API/database startup was not validated successfully (see environment note below).

The visual features called out in the previous task—post menu, liked heart, comments, and profile settings—are already present in committed UI work. `docs/design/newsfeed-reference.html` was untracked at inspection and is intended to be included with this guide. Recheck `git status` and the final commit after this snapshot.

Known environment issue from the last local run: starting the API attempted to connect to MongoDB and failed with DNS `ETIMEOUT`; the API process did not start successfully in that run. A separately available API health endpoint returned HTTP 200, so that response did not prove the newly started API or database was healthy. The React client rendered its auth screen after the redirect-loop fix. Whether the current machine's MongoDB/DNS issue persists is unverified.

## Suggested next steps (priority order)

1. Check `git status`, review each diff, and confirm the intended scope before staging. Never stage `.env`.
2. Run `npm run lint --prefix client` and `npm run build --prefix client`; when server files changed, also run `node --test` and report any environment-dependent failures.
3. Start API and client, verify the browser renders `/` and authenticated routes, and confirm the API can reach the configured MongoDB. A health response alone does not verify database-backed flows.
4. Commit the reviewed work in small, descriptive commits and push normally to the task branch shown by `git branch --show-current` and docs/HANDOFF.md section 2; do not force-push. Verify the existing PR reflects the pushed branch.
5. Revisit the partial items in `docs/AUDIT.md` only when they are in the requested scope.

## Working efficiently (for agents)

- On Windows PowerShell, `npm` may be blocked by execution policy; use `npm.cmd` instead (e.g. `npm.cmd run lint --prefix client`).
- Only read and edit files needed for the task; do not scan the whole repo.
- While iterating, run only the relevant test file (`node --test server/test/<file>.test.js`). Run the full `node --test`, and client lint/build, once at the end. Skip client lint/build if only the backend changed.
- Keep final replies short: files changed, test counts, anything that needs my decision.
- docs/STATUS.md is an older snapshot (2026-11-20, branch `feat/ui-redesign`, 16 tests); verify current status against code and `git log`.
