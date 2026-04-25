# NTL Build — Session Handoff Notes

> Read this first when resuming. Then run `git log --oneline` and check the task list.

## How to resume

1. Read this file.
2. `git log --oneline` to see what's done.
3. Check the persisted task list (Phases 0–10).
4. Continue from the first non-completed phase.

## Where we are

**Last session ended after Phase 4 (Core API routes) including code-review fixes.**

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
| 4. Code review fixes | ✓ done | (will be in next commit) |
| **5. Upload flow (signed URL + client compression)** | **NEXT** | — |
| 6. Pages + components | pending | — |
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

## Phase 5 plan (next up): Upload flow

`POST /api/upload-url` (already in middleware matcher) — captain or roster applicant requests a signed URL for a Supabase Storage upload.

1. Service: `lib/storage-service.ts` — generates a signed URL via `@supabase/supabase-js` with `createSignedUploadUrl`. Path scheme: `${tournamentId}/${teamId}/${matchId}-${uuid}.{ext}` for submissions; `roster/${userId}/${uuid}.{ext}` for roster VOD evidence (if any).
2. Validate file type (image/png|jpeg|webp) and size (< 5 MB) on the **client** before requesting URL.
3. Route handler: zod-validates `{ kind: 'submission' | 'roster', tournamentId?, teamId?, filename, contentType }`, auth-checks the relationship (captain owns team, etc.), returns the signed URL.
4. Client uploads directly. Returns the public URL. Client posts that URL to `POST /api/submissions`.
5. The screenshot prefix check in `app/api/submissions/route.ts` already validates the URL belongs to the bucket.

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
