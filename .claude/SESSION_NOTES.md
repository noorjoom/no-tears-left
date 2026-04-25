# NTL Build — Session Handoff Notes

> Read this first when resuming. Then run `git log --oneline` and check the task list.

## How to resume

1. Read this file.
2. `git log --oneline` to see what's done.
3. Check the persisted task list (Phases 0–10).
4. Continue from the first non-completed phase.

## Where we are

**Last session ended after Phase 2 (Auth + middleware).**

| Phase | Status | Commit |
|-------|--------|--------|
| 0. Scaffold (Next 15 + TS + Tailwind + tooling) | ✓ done | `a5cf3d5` |
| 1. Drizzle schema + initial migration | ✓ done | `e0b67b6` |
| 3. Scoring (TDD, pure functions) | ✓ done | `d09207e` |
| 2. Auth + middleware (Discord OAuth, role guards) | ✓ done | `23b932d` |
| chore: gitignore .claude local | ✓ done | `01f859b` |
| **4. Core API routes (roster, teams, tournaments, submissions)** | **NEXT** | — |
| 5. Upload flow (signed URL + client compression) | pending | — |
| 6. Pages + components | pending | — |
| 7. Rate limiting (Upstash on 5 mutating endpoints) | pending | — |
| 8. Notifications | pending | — |
| 9. Prize pool config | pending | — |
| 10. E2E tests | pending | — |

## Plan summary

The plan follows `ARCHITECTURE.md` §11 implementation order, with **one intentional reorder**: Phase 3 (Scoring) was done before Phase 2 (Auth) because scoring is a pure-function TDD task with zero dependencies, and Phase 4 needs both 2 and 3 done. Don't undo this reorder.

Each phase ends with: typecheck → build (where relevant) → tests → commit.

## Project-specific decisions (locked in by user)

1. **Env credentials**: `.env.example` only — no live Supabase/Discord/Upstash wiring. Don't try to `db:push` or run live auth.
2. **Auth.js v5**: pinned to `next-auth@5.0.0-beta.25`.
3. **Test DB strategy**: `pg-mem` for integration tests in Phase 4. `vitest` is configured; `pg-mem` is already in devDeps.
4. **Admin seeding**: env var `ADMIN_DISCORD_IDS` (comma-separated). Applied idempotently in the Auth.js `signIn` callback on every login. NO manual SQL seed script.
5. **Commit cadence**: ~1 commit per phase or sub-phase. User approved this.
6. **Fonts**: `UnifrakturCook` (display/blackletter), `Inter` (body), `JetBrains Mono` (stats). Already wired in `app/layout.tsx`.

## Gotchas a fresh session would hit

### Build/dependency
- **Don't downgrade Next**: `next@15.0.3` (in original plan) pins React RC, which conflicts with `drizzle-orm`'s optional peers. Stay on `^15.5.15`.
- **React must be stable `^19.0.0`**, not the RC. Don't switch back.

### Drizzle
- `db/index.ts` uses a **lazy `Proxy<NodePgDatabase>` pattern** so importing `{ db }` doesn't crash during Next's build phase when `DATABASE_URL` is unset. Don't replace this with a direct `drizzle(new Pool(...))` call at module top level — `npm run build` will fail.
- Migrations are committed to `db/migrations/` (NOT in `.gitignore`). `npm run db:generate` regenerates them.

### Auth.js v5
- JWT type augmentation via `declare module 'next-auth/jwt'` does NOT work because `next-auth/jwt` re-exports from `@auth/core/jwt` and the `JWT` interface uses `extends Record<string, unknown>`. Don't waste time on augmentation. Instead, use **runtime narrowing** (`typeof token.id === 'string'`) — that's already the pattern in `lib/auth.ts`.
- Two configs exist on purpose: `lib/auth.ts` (full, with DB) for API routes, and `lib/auth-edge.ts` (no DB) for `middleware.ts`. The Edge runtime can't run `pg`. Don't merge them.

### Middleware
- `middleware.ts` matcher carefully lists API routes individually. The `PUBLIC_API_GETS` set lets `GET /api/roster` and `GET /api/tournaments` through without auth. Phase 4 routes must respect this — don't block GETs that should be public.

### Hard rules from `CLAUDE.md` (re-state these every session)
- **No Server Actions**. All mutations go through `app/api/` routes.
- Pages are RSC; fetch data directly via Drizzle.
- Never proxy screenshot uploads through the Next.js server.
- `(match_id, team_id)` unique constraint is **load-bearing** — already in schema, do not weaken.
- Discord OAuth only.
- Role checks in middleware AND re-checked in the API route.
- A mod cannot action their own roster app or their own team's submissions. **Enforce at API layer in Phase 4.**

## Phase 4 plan (next up)

Build in this order. Each sub-phase: write zod schema → write integration test using `pg-mem` → implement route → run tests → commit.

1. **Roster** (`/api/roster`)
   - `GET` (public, list approved members)
   - `POST` (member, submit application — validate one active app per user, no existing roster member, 30-day reapply cooldown after rejection)
   - `PATCH /api/roster/[id]` (MOD+, approve/reject — enforce `reviewedBy !== applicant.userId`)

2. **Teams** (`/api/teams`)
   - `POST` (member, create team for an OPEN tournament — generate `crypto.randomUUID()` invite token, 48h expiry)
   - `GET /api/teams/[id]` (member)
   - `DELETE /api/teams/[id]` (captain, only before tournament window opens)
   - `POST /api/teams/[id]/join` (member, consume invite token — enforce one team per user per tournament)

3. **Tournaments** (`/api/tournaments`)
   - `GET` (public, list)
   - `POST` (MOD+, create)
   - `GET /api/tournaments/[id]` (public)
   - `PATCH /api/tournaments/[id]` (MOD+, update status/settings)

4. **Submissions** (`/api/submissions`)
   - `POST` (captain only — validate `(match_id, team_id)` uniqueness via DB constraint, tournament window open, screenshot URL provided)
   - `PATCH /api/submissions/[id]` (MOD+, verify/reject — enforce mod is not on the team)

After all four sub-phases, run `/code-review` agent before final Phase 4 commit (or one per sub-phase, user approved both cadences).

## Files that exist now

```
app/
  api/auth/[...nextauth]/route.ts
  globals.css
  layout.tsx
  page.tsx
db/
  index.ts        (lazy Proxy)
  schema.ts       (7 tables, 5 enums, unique index on submissions)
  migrations/0000_unusual_white_queen.sql
lib/
  auth.ts         (full Auth.js v5 config — DB callbacks)
  auth-edge.ts    (DB-free, for middleware)
  constants.ts    (placement bonus table, role enum, TTLs)
  role-guard.ts   (hasRole, parseAdminDiscordIds)
  role-guard.test.ts   (12 tests)
  scoring.ts      (calcMatchScore, calcTeamTotal, getPlacementBonus)
  scoring.test.ts (16 tests)
types/
  next-auth.d.ts  (Session augmentation; JWT works via runtime narrowing)
middleware.ts
drizzle.config.ts, next.config.mjs, tailwind.config.ts, tsconfig.json,
vitest.config.ts, vitest.setup.ts, playwright.config.ts,
.env.example, .gitignore, package.json, README.md
```

## Verification before continuing

```bash
npm run typecheck   # must pass
npm test            # must show 28 passing
npm run build       # must succeed (1 dynamic route: /api/auth)
```

If any of these fail on a fresh resume, fix that first before adding Phase 4 code.
