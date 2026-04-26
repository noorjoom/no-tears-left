# CLAUDE.md — No Tears Left (NTL)

Project-specific guidance for Claude Code. Global conventions live in `~/.claude/CLAUDE.md` — this file only covers what's unique to NTL.

---

## What This Is

NTL is a community website for the Fortnite Zero Build (ZB) competitive scene. It serves two purposes:
1. A public-facing community hub with an opt-in roster.
2. A tournament platform for Duo Kill Race events (register → play → submit → ranked).

---

## Source-of-Truth Documents

Always read these before making non-trivial changes:

- **`PRD.md`** — Product requirements, user roles, feature specs, design system, resolved decisions
- **`ARCHITECTURE.md`** — Stack, folder structure, DB schema, API contracts, auth flow, implementation order

If a change contradicts either doc, stop and ask before proceeding. If a decision needs updating, update the doc in the same change.

---

## Stack Snapshot

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 App Router (no `src/` directory) |
| Language | TypeScript |
| Auth | Auth.js v5 (Discord OAuth only) |
| DB | Supabase PostgreSQL via Drizzle ORM |
| Migrations | Drizzle Kit (run locally, never from an API route) |
| Storage | Supabase Storage (public bucket, UUID paths, direct client upload via signed URLs) |
| Rate limiting | Upstash Redis |
| Styling | Tailwind CSS |
| Testing | Vitest + React Testing Library (unit/integration), Playwright (E2E) |
| Hosting | Vercel Hobby (10s function timeout — keep routes fast) |

---

## Hard Rules (Project-Specific)

These override general instincts. Do not deviate without asking.

1. **No Server Actions.** All mutations go through dedicated API routes in `app/api/`. This keeps auth checks and rate limiting consistent and centralized.
2. **Pages are Server Components; fetch data directly via Drizzle.** Client islands are only for interactivity (tabs, modals, forms).
3. **Never proxy screenshot uploads through the Next.js server.** Client compresses → gets signed URL → uploads directly to Supabase Storage.
4. **`(match_id, team_id)` unique constraint is load-bearing.** It's the core anti-cheat. Do not remove or weaken it.
5. **Dashboard and admin pages use URL-routed tabs** (`?tab=...`), not pure client state. Back button must work.
6. **Discord OAuth is the only login method.** No email/password fallback, ever.
7. **Role checks belong in middleware and re-checked in the API route.** Defense in depth — never trust just one layer.
8. **A mod cannot action their own roster application or their own team's submissions.** Enforce at the API layer. ADMINs are exempt from the self-review block (they are trusted to bypass for unblocking edge cases) — MODs are not.

---

## Design System (Quick Reference)

Full palette in `PRD.md` §6. Essentials:

- Background: `#000000` pitch black
- Accent: `#a8c8e8` icy blue (pulled from the chrome logo iridescence)
- Chrome: `#d4d4d4`
- Body text: `#e8e8e8`
- Blackletter font is for brand moments only (hero headings, logo). Body uses a clean sans-serif.
- No warm tones. No gradients except dark-to-darker for depth.

Logo assets live in `assets/` — `ntl.png` is the monogram, `n1.png`/`n2.png`/`n3.png` are wordmark variants.

---

## Roles

`MEMBER` → `MOD` → `ADMIN`. The enum is defined in `db/schema.ts`. At launch there are exactly 2 admins (hardcoded, no self-service).

- `MEMBER`: default on first Discord login
- `MOD`: assigned by an ADMIN; approves roster apps, verifies submissions, creates tournaments
- `ADMIN`: full control including role assignment and prize pool config

Being on the NTL roster is **separate** from having a role. A roster member is just an approved `roster_applications` record — unrelated to RBAC.

---

## Key Flows

### Score Submission
Captain only → fills form (match_id, eliminations, placement, screenshot) → screenshot uploaded client-side direct to Supabase Storage → submission row created with `PENDING` status → mod verifies → `VERIFIED` submissions contribute to cumulative leaderboard.

### Scoring Formula
Pure function in `lib/scoring.ts`:
```
points = eliminations + placement_bonus(placement)
```
Placement bonus table: 1st=10, 2–3=7, 4–5=5, 6–10=3, 11–25=1, 26+=0.

### Team Invite
Captain creates team → gets a single-use token (48h expiry) → shares out-of-band → partner clicks, logs in with Discord, joins. Token is consumed on join or on team disband.

---

## Commands

```bash
npm run dev                 # Local dev server
npm run build               # Production build
npm test                    # Vitest unit/integration tests
npm run test:e2e            # Playwright E2E
npm run db:generate         # Generate Drizzle migration from schema changes
npm run db:push             # Apply migrations to Supabase
npm run lint
npm run typecheck
```

(These will exist after project init — not all are wired up yet.)

---

## Environment

Required `.env.local` keys are listed in `ARCHITECTURE.md` §9. An `.env.example` template lives at the repo root. Never commit `.env.local`.

---

## When in Doubt

- Read `PRD.md` and `ARCHITECTURE.md` first.
- If something isn't specified, ask before inventing a convention.
- Prefer small, focused files (see global rules — 200–400 lines typical).
- Update `PRD.md` or `ARCHITECTURE.md` when a decision changes; don't let them drift from reality.
