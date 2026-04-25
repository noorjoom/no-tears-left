# No Tears Left (NTL)

Fortnite Zero Build community + tournament platform.

See `PRD.md` for product requirements and `ARCHITECTURE.md` for the technical design. Project conventions live in `CLAUDE.md`.

## Quick start

```bash
cp .env.example .env.local   # then fill in values
npm install
npm run dev
```

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start the local dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check (no emit) |
| `npm test` | Vitest unit/integration tests |
| `npm run test:e2e` | Playwright E2E |
| `npm run db:generate` | Generate a Drizzle migration from schema |
| `npm run db:push` | Apply schema to the configured Postgres |

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind · Auth.js v5 (Discord) · Drizzle ORM · Supabase (Postgres + Storage) · Upstash Redis · Vitest · Playwright.
