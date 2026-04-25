# NTL Build — Session Handoff Notes

> Read this first when resuming. Then run `git log --oneline` and check the task list.

## How to resume

1. Read this file.
2. `git log --oneline` to see what's done.
3. Check the persisted task list (Phases 0–10).
4. Continue from the first non-completed phase.

## Where we are

**Last session ended after Phase 6b (Authenticated dashboard + roster apply + team invite UX).**

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
| 6b. Authenticated dashboard + roster apply + team invite UX | ✓ done | (this commit) |
| **6c. Mod/admin pages + screenshot upload UI** | **NEXT** | — |
| 7. Rate limiting (Upstash on 5 mutating endpoints) | pending | — |
| 8. Notifications | pending | — |
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

## Phase 6c plan (after 6b): Mod/admin + upload UI

- `/admin` with URL-routed tabs (roster queue, tournaments, submissions, settings). Middleware already requires ADMIN.
- Screenshot upload UX: `browser-image-compression` (target <500KB, hard <5MB) → `POST /api/upload-url` → PUT to signed URL → `POST /api/submissions` with `publicUrl`.
- Mod review buttons on the queues that PATCH `/api/roster/[id]` and `/api/submissions/[id]`.

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
