# NTL Build — Session Handoff Notes

> Read this first when resuming. Then run `git log --oneline` and check the task list.

## How to resume

1. Read this file.
2. `git log --oneline` to see what's done.
3. Check the persisted task list (Phases 0–10).
4. Continue from the first non-completed phase.

## Where we are

**Last session ended after Phase 6c (Mod review queues + screenshot upload UI).**

| Phase | Status | Commit |
|-------|--------|--------|
| 0. Scaffold (Next 15 + TS + Tailwind + tooling) | ✓ done | `a5cf3d5` |
| 1. Drizzle schema + initial migration | ✓ done | `e0b67b6` |
| 3. Scoring (TDD, pure functions) | ✓ done | `d09207e` |
| 2. Auth + middleware (Discord OAuth, role guards) | ✓ done | `23b932d` |
| 4a. Helpers + pglite test harness | ✓ done | `chore(api): helpers...` |
| 4a. Roster API | ✓ done | `feat(api): roster routes...` |
| 4b. Teams API | ✓ done | `feat(api): teams routes...` |
| 4c. Tournaments API + middleware mod-write guard | ✓ done | `feat(api): tournaments...` |
| 4d. Submissions API | ✓ done | `feat(api): submissions...` |
| 4. Code review fixes | ✓ done | `ba7224a` |
| 5. Upload flow (signed URL, server side) | ✓ done | `b5a1cd9` |
| 6a. Public pages + deferred GETs + leaderboard service | ✓ done | `b6bb717` |
| 6b. Authenticated dashboard + roster apply + team invite UX | ✓ done | `177d5ee` |
| 6c. Mod review queues + screenshot upload UI | ✓ done | `9dcb2aa` |
| 7. Rate limiting (Upstash on 5 mutating endpoints) | ✓ done | (this commit) |
| **8. Notifications** | **NEXT** | — |
| 9. Prize pool config | pending | — |
| 10. E2E tests | pending | — |

## Phase 4 summary

77 tests passing. Test infra rests on **pglite** (real Postgres in WASM) via `lib/db-test.ts` rather than pg-mem — pg-mem doesn't support `getTypeParser` or `rowMode: 'array'` which drizzle's node-postgres driver requires. **Do not switch back to pg-mem.**

**Test files use `// @vitest-environment node`** at the top because pglite needs Node fetch/Response, not jsdom.

### Architecture choice: services vs routes
Each API surface has a `lib/<x>-service.ts` module that takes a `db` parameter. Routes are thin wrappers that:
1. Auth check (`requireUser` / `requireRole`)
2. Zod parse
3. Call service
4. Map service `ServiceResult` to HTTP envelope (`ok`/`fail`)

This keeps integration tests clean — they call services directly against the pglite DB, never go through `auth()`.

### Code-review fixes applied
1. **Admin middleware required `MOD` instead of `ADMIN`** — fixed.
2. **`joinTeam` TOCTOU**: added `isNull(teams.partnerId)` guard to UPDATE WHERE, return TEAM_FULL if 0 rows. Regression test added.
3. **`reviewApplication` / `reviewSubmission` undefined-row crash**: both now check `if (!updated)` after concurrent-safe UPDATE and return `NOT_PENDING`.
4. **Cooldown null-fail-open**: `roster-service.createApplication` now treats a REJECTED row with null `reviewedAt` as cooldown active. Regression test added.
5. **DRAFT tournament leakage**: `listTournaments`/`getTournament` now hide DRAFT by default; routes pass `includeDrafts: true` only for MOD+ callers.
6. **Screenshot URL whitelist**: `POST /api/submissions` now requires `screenshotUrl` to start with `${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${SUPABASE_STORAGE_BUCKET}/`. Skipped when env vars unset (dev mode).

### Deferred from code review (carryover for Phase 6)
These are missing GET endpoints — they're additive features, not blockers:
- `GET /api/roster/[id]` (mod fetches a single application for review UI)
- `GET /api/admin/roster?status=PENDING` (mod queue)
- `GET /api/teams/[id]` for MOD/ADMIN (currently `getTeamForMember` returns FORBIDDEN; mods need bypass)
- `GET /api/submissions` listing (captain history + mod queue)

Add when wiring the dashboard pages in Phase 6.

## Plan summary (overall)

The plan follows `ARCHITECTURE.md` §11 implementation order, with **one intentional reorder**: Phase 3 (Scoring) was done before Phase 2 (Auth) because scoring is a pure-function TDD task with zero dependencies. Don't undo this reorder.

Each phase ends with: typecheck → build → tests → commit.

## Project-specific decisions (locked in by user)

1. **Env credentials**: `.env.example` only — no live Supabase/Discord/Upstash wiring. Don't try to `db:push` or run live auth.
2. **Auth.js v5**: pinned to `next-auth@5.0.0-beta.25`.
3. **Test DB strategy**: `@electric-sql/pglite` via `lib/db-test.ts`. Switched away from pg-mem (was in original plan) due to incompatibility with drizzle's node-postgres driver.
4. **Admin seeding**: env var `ADMIN_DISCORD_IDS` (comma-separated). Applied idempotently in the Auth.js `signIn` callback on every login.
5. **Commit cadence**: ~1 commit per phase or sub-phase.
6. **Fonts**: `UnifrakturCook` (display/blackletter), `Inter` (body), `JetBrains Mono` (stats). Wired in `app/layout.tsx`.

## Gotchas a fresh session would hit

### Build/dependency
- **Don't downgrade Next**: `next@15.0.3` (in original plan) pins React RC, which conflicts with `drizzle-orm`'s optional peers. Stay on `^15.5.15`.
- **React must be stable `^19.0.0`**, not the RC.

### Drizzle
- `db/index.ts` uses a **lazy `Proxy<NodePgDatabase>` pattern** so importing `{ db }` doesn't crash during Next's build phase when `DATABASE_URL` is unset. Don't replace this with a direct `drizzle(new Pool(...))` call at module top level — `npm run build` will fail.
- Migrations are committed to `db/migrations/` (NOT in `.gitignore`).

### Auth.js v5
- JWT type augmentation via `declare module 'next-auth/jwt'` does NOT work because `next-auth/jwt` re-exports from `@auth/core/jwt` and the `JWT` interface uses `extends Record<string, unknown>`. Use **runtime narrowing** (`typeof token.id === 'string'`) — that's the pattern in `lib/auth.ts`.
- Two configs exist on purpose: `lib/auth.ts` (full, with DB) for API routes, and `lib/auth-edge.ts` (no DB) for `middleware.ts`. The Edge runtime can't run `pg`. Don't merge them.

### Middleware
- Tournaments routes: GET is public; non-GET requires MOD (enforced both in middleware and re-checked in handler via `requireRole('MOD')`).
- Admin routes (`/admin`, `/api/admin`) require **ADMIN** (was MOD, now fixed).
- The `PUBLIC_API_GETS` set lets `GET /api/roster` and exact-path `GET /api/tournaments` through. `MOD_WRITE_PREFIXES` handles `GET /api/tournaments/[id]` as public via prefix match.

### Testing with pglite
- Add `// @vitest-environment node` to the **first line** of any test that imports `db-test`.
- Each test creates a fresh PGlite instance (~1s init). 77 tests run in ~30s. Acceptable.
- Always call `await close()` in `afterEach` to free WASM memory.

### Hard rules from `CLAUDE.md` (re-state these every session)
- **No Server Actions**. All mutations go through `app/api/` routes.
- Pages are RSC; fetch data directly via Drizzle.
- Never proxy screenshot uploads through the Next.js server.
- `(match_id, team_id)` unique constraint is **load-bearing** — already in schema and verified by integration tests.
- Discord OAuth only.
- Role checks in middleware AND re-checked in the API route.
- A mod cannot action their own roster app or their own team's submissions.

## Phase 5 summary

`POST /api/upload-url` is wired. Service is `lib/storage-service.ts`; the Supabase adapter (`lib/storage-adapter.ts`) is injected so tests run with a fake. Request body is a Zod discriminated union on `kind` (`'submission' | 'roster'`).

- Submission path: `${tournamentId}/${teamId}/${sanitizedMatchId}-${uuid}.${ext}`. Service requires (a) team belongs to that tournament, (b) caller is captain, (c) tournament status ∈ {OPEN, IN_PROGRESS}, (d) now within `[startsAt, endsAt]`. Defense in depth: `POST /api/submissions` already re-checks captain + window when the actual submission is created.
- Roster path: `roster/${userId}/${uuid}.${ext}`. Any authed user.
- Allowed content types: `image/png`, `image/jpeg`, `image/webp`. Extension derived server-side; matchId is sanitized (`[^a-zA-Z0-9_-]` → `_`).
- Adapter returns `{ signedUrl, token, path }`. Public URL is computed `${publicBaseUrl}/${path}` and matches the prefix that `app/api/submissions/route.ts` whitelists.
- When `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_STORAGE_BUCKET` are unset, the route returns 503. (The submissions screenshot prefix check stays no-op in that mode, same as before.)
- Client-side image compression + upload UX is **deferred to Phase 6** (lives in components).
- 11 new tests; 88 total green.

## Phase 6a summary

Public read paths shipped. RSC pages call services directly; no fetch-from-self.

**New pages (all RSC, `dynamic = 'force-dynamic'`):**
- `/` — landing with Nav + hero + CTAs
- `/roster` — approved roster grid
- `/leaderboard` — cumulative table
- `/leaderboard/host` — top 5, no nav (OBS view)
- `/tournaments` — tournament list (DRAFTs hidden)
- `/tournaments/[id]` — detail + team list

**New components:**
- `components/layout/Nav.tsx` (server, reads `auth()` for sign-in/dashboard link)
- `components/layout/Footer.tsx`
- `components/ui/Badge.tsx`
- `components/roster/RosterGrid.tsx`
- `components/leaderboard/LeaderboardTable.tsx`
- `components/tournaments/TournamentCard.tsx`, `TeamList.tsx`

**New service: `lib/leaderboard-service.ts`**
- `getCumulativeLeaderboard(db)` — JOIN submissions → teams → tournaments → users (alias for captain & partner). Aggregates VERIFIED only via `calcMatchScore`. Sort: points DESC, then matches DESC. 5 pglite tests.
- Note: a captain who plays multiple tournaments produces multiple rows (team identity is per-tournament). This matches the team-centric leaderboard concept.

**`lib/safe-fetch.ts`** — wraps service calls in RSC pages so they render an empty fallback when `DATABASE_URL` is unset (dev mode without local Postgres).

**Deferred GET endpoints (filled in this commit):**
- `GET /api/roster?status=PENDING|APPROVED|REJECTED` (mod-gated in handler; no `?status` is the existing public approved-roster list)
- `GET /api/roster/[id]` (mod-only single-app fetch with discord username)
- `GET /api/teams/[id]` — adds MOD/ADMIN bypass via `getTeamById` (members still get the original `getTeamForMember` flow)
- `GET /api/submissions?teamId=...` (member or mod) and `?status=...` (mod queue)

**Middleware fix:** added literal `/api/submissions` to matcher (the `:path*` form alone didn't cover the bare path needed by the new GET).

**Tailwind tokens used:** `bg-base`, `bg-surface`, `bg-elevated`, `border` (DEFAULT), `text-primary`, `text-muted`, `accent`, `accent-bright`, `chrome`, fonts `display`/`mono`. All defined in `tailwind.config.ts`; nothing new added.

**Tests:** 93 total (was 88, +5 leaderboard). Typecheck + build clean. 18 routes including 6 new pages.

## Phase 6b summary

Authenticated UX shipped. 99 tests passing (was 93, +6 service tests).

**New pages:**
- `/dashboard` — RSC, redirects to `/` if unauthed; URL-routed tabs (`?tab=application|teams|notifications`) per hard rule #5; only fetches data for the active tab.
- `/roster/apply` — RSC; branches by existing application status (no app / PENDING / APPROVED / REJECTED-cooldown / REJECTED-elapsed → form).
- `/teams/join?token=...` — RSC; redirects through Discord sign-in with `callbackUrl` preserved when unauthed.

**New services:**
- `lib/roster-service.ts::getApplicationForUser(db, userId)` — most-recent app per user.
- `lib/teams-service.ts::getTeamsForUser(db, userId)` — JOINs tournaments for the dashboard list.
- `lib/teams-service.ts::getTeamForUserInTournament(db, userId, tournamentId)` — used on tournament detail to render captain UX inline.

**New components:**
- `components/dashboard/`: `ApplicationTab.tsx`, `TeamsTab.tsx`, `NotificationsTab.tsx` (placeholder), `InviteLinkBox.tsx` (client island, clipboard copy).
- `components/roster/RosterApplyForm.tsx` — client island, fetch POST `/api/roster`, error code → human message map.
- `components/tournaments/CreateTeamButton.tsx` — captain inline form on tournament detail.
- `components/teams/JoinTeamForm.tsx` — partner-side confirm.

**New API route:**
- `POST /api/teams/join` — token-only join (mirror of existing `[id]/join` but path-shape simplified for the join page). Auth-protected via existing `/api/teams/:path*` middleware matcher.

**Tournament detail page** now shows captain/partner state when authed: create-team CTA when no team & status=OPEN, otherwise the team card with InviteLinkBox if open seat, or "registration closed" message.

### Gotchas / decisions
- All forms POST to `/api/` (no Server Actions — hard rule #1).
- Auth-redirect strategy on `/teams/join` is in the page (uses `callbackUrl`), not middleware, so the token survives the round trip. Middleware does NOT match `/teams/*`.
- Error-code → message maps live in client components (small inline records). The service result codes are already stable.
- `RosterApplyForm` uses `FormData` + `fetch`, not RHF/Zod-on-client, to keep the bundle small. Server-side Zod in `/api/roster` is the source of truth.

## Phase 6b plan (done — kept for reference)

- /dashboard URL-routed tabs ✓
- /roster/apply form ✓
- Team create + invite + join ✓

## Phase 6c summary

Mod review UX + captain submission upload shipped. 100 tests passing (+1).

**New pages:**
- `/mod` — RSC, gated to MOD+ in middleware AND re-checked in handler. URL-routed tabs (`?tab=roster|submissions`). Renders `ModRosterQueue` / `ModSubmissionsQueue`.
- `/tournaments/[id]/submit` — RSC, captain-only. Gated by `getTeamForUserInTournament` + captain check. Renders `SubmissionUploadForm`.

**New components:**
- `components/mod/ModRosterQueue.tsx` — pending applications with approve/reject + optional review note. PATCHes `/api/roster/[id]`. Error code → human message map.
- `components/mod/ModSubmissionsQueue.tsx` — pending submissions with screenshot preview, computed score, conflict-of-interest banner (captain/partner mod can see entry but not act). PATCHes `/api/submissions/[id]`.
- `components/submissions/SubmissionUploadForm.tsx` — full upload pipeline: validate → `imageCompression` (target 500KB, hard 5MB) → POST `/api/upload-url` → PUT signed URL → POST `/api/submissions`. Stages: `compressing | uploading | submitting`.

**Service additions:**
- `lib/submissions-service.ts::listSubmissionsByStatusWithContext` — JOINs teams + tournaments for the mod queue (so we can show team name, tournament name, captain/partner ids for conflict-of-interest detection in the UI). 1 new test.

**Middleware:**
- Added `MOD_PREFIXES = ['/mod']` plus matcher entry `/mod/:path*`. Defense in depth — `/mod` requires MOD-or-higher in middleware AND `requireRole('MOD')` is re-checked at every PATCH endpoint it calls.
- `/admin` is intentionally still ADMIN-only and unused (reserved for Phase 9 prize-pool config and role assignment).

**Nav:** Mods/admins now see a "Mod" link to the queue.

**Tournament detail page:** captains see a "Submit a result" CTA when status is OPEN or IN_PROGRESS.

### Gotchas / decisions
- The signed-URL response envelope is `{ success, data: { signedUrl, publicUrl, ... } }`. Form unwraps `body.data` — easy to forget.
- `calcMatchScore` signature is `(eliminations, placement)` (positional, not an object) — matches existing scoring.test.ts usage.
- `browser-image-compression` was already in package.json from a prior phase — no install needed.
- `Submit result` button intentionally appears for both OPEN and IN_PROGRESS, but the `createSubmission` service is the real source of truth (returns WINDOW_CLOSED if outside startsAt..endsAt).
- Conflict-of-interest is enforced at the API/service layer; the UI also hides the action buttons as a courtesy and shows a yellow banner.
- All client components POST to `/api/*`. No Server Actions.

## Phase 6c plan (done — kept for reference)

- /mod URL-routed tabs ✓
- Submission upload UX (compress → signed URL → PUT → POST) ✓
- Mod review buttons on queues ✓

## Phase 7 summary

Upstash rate limiting wired into the 5 mutating endpoints. **113 tests passing (+13).**

**New files:**
- `lib/rate-limit.ts` — `RateLimiter` adapter interface, `BUCKETS` config, `createRateLimiter()` factory (Upstash sliding-window via `@upstash/ratelimit`, falls back to a noop limiter when `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` are unset), `enforceRateLimit()` helper that returns a 429 `NextResponse` with `RATE_LIMITED` body + `Retry-After` header. Singleton via `getRateLimiter()` with `__setRateLimiterForTest` / `__resetRateLimiterForTest` for injection.
- `lib/rate-limit-fake.ts` — `createFakeRateLimiter({ allow, reset })` test helper. Records calls.
- `lib/rate-limit.test.ts` — 6 unit tests: BUCKETS values match ARCHITECTURE.md §8, env-driven noop fallback, test override, allow → null, deny → 429 + Retry-After, Retry-After clamped ≥1s.
- `lib/rate-limit-routes.test.ts` — 7 integration tests. Mocks `./auth` + `@/db` (the db proxy throws on access to prove the rate limiter short-circuits before any DB work). Verifies 429 + RATE_LIMITED + Retry-After on all 5 routes (`/api/roster`, `/api/teams`, `/api/teams/join`, `/api/teams/[id]/join`, `/api/submissions`, `/api/upload-url` — 6 POST handlers, two of which share the `teams.join` bucket). Plus a fail-open passthrough test.

**Edits:**
- `lib/api-response.ts` — `fail()` accepts an optional `{ headers }` init for `Retry-After`. Backward compatible (existing 2-arg call sites unchanged).
- 5 route POST handlers each insert `enforceRateLimit(getRateLimiter(), '<bucket>', auth.user.id)` immediately after `requireUser()`, before zod parsing or any DB work.
- `ARCHITECTURE.md` §8 — limits table updated with bucket names; documents the deliberate exclusion of mod-only PATCH/DELETE endpoints.

**Bucket config (matches ARCHITECTURE.md §8):**

| Bucket | Limit |
|--------|-------|
| `roster.apply` | 3 / 24h |
| `teams.create` | 10 / 1h |
| `teams.join` (shared by both join routes) | 10 / 1h |
| `submissions.create` | 30 / 1h |
| `upload-url` | 30 / 1h |

### Decisions (locked in)
- **Keying by `userId`** (all 5 endpoints are auth-gated). No IP fallback — Vercel proxies + shared NAT make IP unreliable.
- **Layer:** Route handler, not Next middleware. Middleware runs before `auth()` resolves the session, so userId keying needs the handler. Defense in depth preserved (middleware still does role checks).
- **Error envelope unchanged.** Single `error` field with the `RATE_LIMITED` machine code as its value. No new `code` field — keeps existing `fail()` call sites untouched.
- **Fail-open** when Upstash env vars are unset. In production, a single `console.warn` at module init alerts ops without breaking the route. Same pattern as `storage-adapter.ts`.
- **Singleton + test override.** `getRateLimiter()` lazily creates one limiter; test code calls `__setRateLimiterForTest(fake)` in `beforeEach` and `__resetRateLimiterForTest()` in `afterEach`.

### Gotchas / things that bit during the build
- `Ratelimit.slidingWindow()` window-string format: use `"3600 s"`, not `"1h"` — passing the seconds string is the safest portable form.
- The integration test mocks `@/db` with a Proxy that throws on access. This is intentional: it proves the limiter short-circuits before any DB call. Don't try to "fix" the test by giving it a real db handle.
- `vi.mock('./auth', ...)` returns a default authed user; the actual route never reaches anything beyond rate-limit when the fake denies, so the body shape only needs to be parseable enough to reach the limiter check (which runs after `requireUser` and before zod). Rate-limit runs **after** auth and **before** zod, so even minimally-shaped bodies trigger the 429 path correctly.

### What was deliberately NOT rate-limited
PATCH/DELETE on `/api/roster/[id]`, `/api/submissions/[id]`, `/api/teams/[id]`, `/api/tournaments/[id]`, `/api/tournaments`. These are MOD/ADMIN-gated; throttling moderation during a tournament window would harm UX. Documented in ARCHITECTURE.md §8.

## Files added in Phase 4

```
lib/
  api-auth.ts            # requireUser / requireRole
  api-response.ts        # ok / fail envelope
  db-test.ts             # pglite harness with full schema
  db-test.test.ts        # smoke (3 tests)
  roster-service.ts      # createApplication / reviewApplication / listApprovedRoster
  roster-service.test.ts # 12 tests
  teams-service.ts       # createTeam / joinTeam / deleteTeam / getTeamForMember
  teams-service.test.ts  # 15 tests (incl. concurrent-join regression)
  tournaments-service.ts # list / get / create / update (DRAFT-aware)
  tournaments-service.test.ts # 8 tests
  submissions-service.ts # createSubmission / reviewSubmission / listSubmissionsForTeam
  submissions-service.test.ts # 11 tests

app/api/
  roster/route.ts                # GET, POST
  roster/[id]/route.ts            # PATCH
  teams/route.ts                  # POST
  teams/[id]/route.ts             # GET, DELETE
  teams/[id]/join/route.ts        # POST
  tournaments/route.ts            # GET, POST
  tournaments/[id]/route.ts       # GET, PATCH
  submissions/route.ts            # POST (with screenshot URL whitelist)
  submissions/[id]/route.ts       # PATCH

middleware.ts                     # ADMIN guard fixed; tournaments mod-write guard added
```

## Verification before continuing

```bash
npm run typecheck   # must pass
npm test            # must show 77 passing
npm run build       # must succeed (10 dynamic API routes)
```

If any of these fail on a fresh resume, fix that first before adding Phase 5 code.
