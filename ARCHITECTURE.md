# Architecture Document — No Tears Left (NTL) MVP

**Version:** 1.0  
**Date:** 2026-04-24  
**Stack:** Next.js 15 App Router · Auth.js v5 · Drizzle ORM · Supabase · Tailwind CSS · Vercel Hobby

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Client                           │
│   Next.js pages (RSC) + minimal React client islands   │
└────────────────────┬────────────────────────────────────┘
                     │ fetch()
┌────────────────────▼────────────────────────────────────┐
│               Next.js API Routes                        │
│   /api/auth/[...nextauth]  /api/roster  /api/teams      │
│   /api/tournaments  /api/submissions  /api/admin        │
│   /api/upload-url  /api/notifications                   │
│                                                         │
│   Middleware: auth session check + role guard           │
│   Upstash rate limiting on mutating endpoints           │
└──────────┬──────────────────────────┬───────────────────┘
           │                          │
┌──────────▼──────────┐   ┌───────────▼──────────────────┐
│   Drizzle ORM       │   │   Supabase Storage           │
│   Supabase Postgres │   │   (screenshots)              │
└─────────────────────┘   └──────────────────────────────┘
```

**Data flow rule:** Pages are Server Components that fetch display data directly via Drizzle. All mutations go through API routes. No Server Actions — explicit API routes keep rate limiting and auth checks in one place.

---

## 2. Folder Structure

> No `src/` directory. App Router convention works cleanly at the root level — no extra indirection.

```
no-tears-left/
├── app/
│   ├── layout.tsx                  # Root layout: fonts, theme, session provider
│   ├── page.tsx                    # Landing page (public)
│   ├── roster/
│   │   ├── page.tsx                # Public roster list (RSC)
│   │   └── apply/
│   │       └── page.tsx            # Application form (client island)
│   ├── leaderboard/
│   │   ├── page.tsx                # Cumulative leaderboard (RSC)
│   │   └── host/
│   │       └── page.tsx            # OBS Host View — top 5, no nav
│   ├── tournaments/
│   │   ├── page.tsx                # Tournament list (RSC)
│   │   └── [id]/
│   │       └── page.tsx            # Tournament detail + team list (RSC)
│   ├── dashboard/
│   │   └── page.tsx                # Member dashboard — tab-switched (client)
│   ├── admin/
│   │   └── page.tsx                # Admin dashboard — tab-switched (client)
│   └── api/
│       ├── auth/
│       │   └── [...nextauth]/
│       │       └── route.ts        # Auth.js v5 handler
│       ├── roster/
│       │   ├── route.ts            # GET (list approved) · POST (submit application)
│       │   └── [id]/
│       │       └── route.ts        # PATCH (mod: approve/reject)
│       ├── teams/
│       │   ├── route.ts            # POST (create team / generate invite)
│       │   └── [id]/
│       │       ├── route.ts        # GET (team detail) · DELETE (captain disbands)
│       │       └── join/
│       │           └── route.ts    # POST (partner joins via token)
│       ├── tournaments/
│       │   ├── route.ts            # GET (list) · POST (mod/admin: create)
│       │   └── [id]/
│       │       └── route.ts        # GET (detail) · PATCH (mod/admin: update status)
│       ├── submissions/
│       │   ├── route.ts            # POST (captain: submit score)
│       │   └── [id]/
│       │       └── route.ts        # PATCH (mod: verify/reject)
│       ├── upload-url/
│       │   └── route.ts            # POST (generate signed Supabase upload URL)
│       ├── notifications/
│       │   └── route.ts            # GET (user's notifications) · PATCH (mark read)
│       └── admin/
│           ├── prize-pool/
│           │   └── route.ts        # GET · PATCH (admin: update goal/current)
│           └── roles/
│               └── route.ts        # PATCH (admin: assign/revoke mod role)
│
├── components/
│   ├── ui/                         # Primitive components (Button, Input, Badge, Modal)
│   ├── layout/
│   │   ├── Nav.tsx                 # Top navigation bar
│   │   └── Footer.tsx
│   ├── roster/
│   │   ├── RosterGrid.tsx          # Approved member cards
│   │   └── ApplicationForm.tsx     # Client island: roster apply form
│   ├── leaderboard/
│   │   ├── LeaderboardTable.tsx
│   │   └── HostView.tsx            # Stripped-down OBS view
│   ├── tournaments/
│   │   ├── TournamentCard.tsx
│   │   └── TeamList.tsx
│   ├── dashboard/
│   │   ├── DashboardTabs.tsx       # Tab switcher (client)
│   │   ├── MyApplicationTab.tsx
│   │   ├── MyTeamsTab.tsx
│   │   └── NotificationsTab.tsx
│   └── admin/
│       ├── AdminTabs.tsx           # Tab switcher (client)
│       ├── RosterQueueTab.tsx
│       ├── TournamentManagerTab.tsx
│       ├── SubmissionQueueTab.tsx
│       └── SettingsTab.tsx         # Prize pool + role management
│
├── db/
│   ├── index.ts                    # Drizzle client singleton
│   ├── schema.ts                   # All table definitions
│   └── migrations/                 # Drizzle Kit generated migrations
│
├── lib/
│   ├── auth.ts                     # Auth.js v5 config (Discord provider, callbacks)
│   ├── middleware.ts               # Route protection logic (role checks)
│   ├── rate-limit.ts               # Upstash rate limiter factory
│   ├── upload.ts                   # Supabase signed URL generation
│   ├── scoring.ts                  # Points calculation (pure function, easily testable)
│   └── constants.ts                # Placement bonus table, role enums, etc.
│
├── hooks/
│   └── useNotifications.ts         # Client hook: poll/fetch notifications
│
├── middleware.ts                   # Next.js middleware: session check + role-based redirect
│
├── drizzle.config.ts               # Drizzle Kit config
├── .env.local                      # Local secrets (never committed)
└── .env.example                    # Template with required variable names
```

---

## 3. Database Schema (Drizzle)

```typescript
// db/schema.ts

export const roleEnum = pgEnum('role', ['MEMBER', 'MOD', 'ADMIN']);
export const platformEnum = pgEnum('platform', ['PC', 'CONSOLE']);
export const applicationStatusEnum = pgEnum('application_status', ['PENDING', 'APPROVED', 'REJECTED']);
export const tournamentStatusEnum = pgEnum('tournament_status', ['DRAFT', 'OPEN', 'IN_PROGRESS', 'CLOSED', 'ARCHIVED']);
export const submissionStatusEnum = pgEnum('submission_status', ['PENDING', 'VERIFIED', 'REJECTED']);

export const users = pgTable('users', {
  id:              uuid('id').defaultRandom().primaryKey(),
  discordId:       text('discord_id').notNull().unique(),
  discordUsername: text('discord_username').notNull(),
  discordAvatar:   text('discord_avatar'),
  role:            roleEnum('role').notNull().default('MEMBER'),
  createdAt:       timestamp('created_at').defaultNow().notNull(),
});

export const rosterApplications = pgTable('roster_applications', {
  id:           uuid('id').defaultRandom().primaryKey(),
  userId:       uuid('user_id').notNull().references(() => users.id),
  epicUsername: text('epic_username').notNull(),
  platform:     platformEnum('platform').notNull(),
  timezone:     text('timezone').notNull(),
  whyText:      text('why_text').notNull(),
  vodUrl:       text('vod_url'),
  status:       applicationStatusEnum('status').notNull().default('PENDING'),
  reviewedBy:   uuid('reviewed_by').references(() => users.id),
  reviewNote:   text('review_note'),
  reviewedAt:   timestamp('reviewed_at'),
  createdAt:    timestamp('created_at').defaultNow().notNull(),
});

export const tournaments = pgTable('tournaments', {
  id:                   uuid('id').defaultRandom().primaryKey(),
  name:                 text('name').notNull(),
  description:          text('description'),
  registrationDeadline: timestamp('registration_deadline').notNull(),
  startsAt:             timestamp('starts_at').notNull(),
  endsAt:               timestamp('ends_at').notNull(),
  maxTeams:             integer('max_teams'),
  status:               tournamentStatusEnum('status').notNull().default('DRAFT'),
  createdBy:            uuid('created_by').notNull().references(() => users.id),
  createdAt:            timestamp('created_at').defaultNow().notNull(),
});

export const teams = pgTable('teams', {
  id:               uuid('id').defaultRandom().primaryKey(),
  tournamentId:     uuid('tournament_id').notNull().references(() => tournaments.id),
  captainId:        uuid('captain_id').notNull().references(() => users.id),
  partnerId:        uuid('partner_id').references(() => users.id),
  name:             text('name').notNull(),
  inviteToken:      text('invite_token').unique(),
  inviteExpiresAt:  timestamp('invite_expires_at'),
  createdAt:        timestamp('created_at').defaultNow().notNull(),
});

export const submissions = pgTable('submissions', {
  id:            uuid('id').defaultRandom().primaryKey(),
  teamId:        uuid('team_id').notNull().references(() => teams.id),
  tournamentId:  uuid('tournament_id').notNull().references(() => tournaments.id),
  matchId:       text('match_id').notNull(),
  eliminations:  integer('eliminations').notNull(),
  placement:     integer('placement').notNull(),
  screenshotUrl: text('screenshot_url').notNull(),
  status:        submissionStatusEnum('status').notNull().default('PENDING'),
  reviewedBy:    uuid('reviewed_by').references(() => users.id),
  reviewNote:    text('review_note'),
  reviewedAt:    timestamp('reviewed_at'),
  submittedAt:   timestamp('submitted_at').defaultNow().notNull(),
}, (t) => ({
  uniqueMatchTeam: uniqueIndex('unique_match_team').on(t.matchId, t.teamId),
}));

export const notifications = pgTable('notifications', {
  id:        uuid('id').defaultRandom().primaryKey(),
  userId:    uuid('user_id').notNull().references(() => users.id),
  type:      text('type').notNull(),   // 'roster_approved' | 'roster_rejected' | 'submission_verified' | 'submission_rejected' | 'partner_joined'
  message:   text('message').notNull(),
  read:      boolean('read').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const prizePoolConfig = pgTable('prize_pool_config', {
  id:           uuid('id').defaultRandom().primaryKey(),
  goalAmount:   integer('goal_amount').notNull().default(0),
  currentAmount: integer('current_amount').notNull().default(0),
  koFiUrl:      text('ko_fi_url'),
  updatedAt:    timestamp('updated_at').defaultNow().notNull(),
  updatedBy:    uuid('updated_by').references(() => users.id),
});
```

---

## 4. Authentication & Middleware

### Auth.js v5 Config (`lib/auth.ts`)
- Provider: Discord OAuth
- Callbacks:
  - `signIn`: check user exists in DB; create record on first login
  - `session`: attach `user.id` and `user.role` to session object
  - `jwt`: persist `id` and `role` in the JWT

### Middleware (`middleware.ts`)
Runs on every request before the route handler.

```
/admin/*          → require MOD or ADMIN role → redirect to / if not
/dashboard/*      → require any authenticated session → redirect to / if not
/roster/apply     → require any authenticated session
/api/admin/*      → require MOD or ADMIN role → 403 if not
/api/roster POST  → require authenticated session
/api/teams/*      → require authenticated session
/api/submissions  → require authenticated session
```

Public routes (no middleware): `/`, `/roster`, `/leaderboard`, `/leaderboard/host`, `/tournaments`, `/tournaments/[id]`

---

## 5. API Route Contracts

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET/POST | `/api/auth/[...nextauth]` | — | Auth.js handler |

### Roster
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/roster` | Public | List approved members |
| POST | `/api/roster` | Member | Submit application |
| PATCH | `/api/roster/[id]` | MOD+ | Approve or reject application |

### Teams
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/teams` | Member | Create team + generate invite token |
| GET | `/api/teams/[id]` | Member | Team detail |
| DELETE | `/api/teams/[id]` | Captain | Disband team (pre-window only) |
| POST | `/api/teams/[id]/join` | Member | Join team via invite token |

### Tournaments
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/tournaments` | Public | List all tournaments |
| POST | `/api/tournaments` | MOD+ | Create tournament |
| GET | `/api/tournaments/[id]` | Public | Tournament detail |
| PATCH | `/api/tournaments/[id]` | MOD+ | Update status or settings |

### Submissions
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/submissions` | Captain | Submit match result |
| PATCH | `/api/submissions/[id]` | MOD+ | Verify or reject submission |

### Upload
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/upload-url` | Member | Get signed Supabase Storage URL |

### Notifications
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/notifications` | Member | Fetch user's notifications |
| PATCH | `/api/notifications` | Member | Mark notification(s) as read |

### Admin
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/prize-pool` | MOD+ | Get current config |
| PATCH | `/api/admin/prize-pool` | ADMIN | Update goal/current/ko-fi URL |
| PATCH | `/api/admin/roles` | ADMIN | Assign or revoke MOD role |

---

## 6. Screenshot Upload Flow

```
1. Client compresses image (browser-image-compression, target < 500KB)
2. Client POST /api/upload-url  →  server generates Supabase signed URL
3. Client PUT directly to Supabase Storage via signed URL
4. Client receives the public storage URL
5. Client includes screenshot_url in the submission POST body
```

Server never touches the image bytes. Supabase Storage bucket is set to **public** — Supabase generates UUID-based paths so URLs are unguessable in practice. The signed URL grants a single 60-second upload window; after upload the permanent public URL is stored in the DB and rendered directly in the mod verification view.

---

## 7. Scoring Logic (`lib/scoring.ts`)

```typescript
const PLACEMENT_BONUS: Record<string, number> = {
  '1':     10,
  '2-3':    7,
  '4-5':    5,
  '6-10':   3,
  '11-25':  1,
};

function getPlacementBonus(placement: number): number { ... }

export function calcMatchScore(eliminations: number, placement: number): number {
  return eliminations + getPlacementBonus(placement);
}

export function calcTeamTotal(verifiedSubmissions: { eliminations: number; placement: number }[]): number {
  return verifiedSubmissions.reduce((sum, s) => sum + calcMatchScore(s.eliminations, s.placement), 0);
}
```

Pure functions — no DB dependency, fully unit testable.

---

## 8. Rate Limiting (`lib/rate-limit.ts`)

Using Upstash Redis via `@upstash/ratelimit`. Applied per-IP at the API route level.

| Endpoint | Limit |
|----------|-------|
| `POST /api/roster` | 3 requests / 24h per IP |
| `POST /api/teams` | 10 requests / 1h per IP |
| `POST /api/teams/[id]/join` | 10 requests / 1h per IP |
| `POST /api/submissions` | 30 requests / 1h per IP |
| `POST /api/upload-url` | 30 requests / 1h per IP |

---

## 9. Environment Variables

```bash
# .env.example

# Auth.js
AUTH_SECRET=
AUTH_DISCORD_ID=
AUTH_DISCORD_SECRET=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=       # server-only: for signed URL generation

# Database (Supabase connection string)
DATABASE_URL=                    # used by Drizzle

# Upstash
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# App
NEXT_PUBLIC_APP_URL=             # e.g. https://notearsle.ft or localhost:3000
```

---

## 10. Key Technical Constraints & Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Vercel Hobby 10s function timeout | LOW | No long-running operations in API routes; uploads bypass server entirely |
| Invite token collision | LOW | Use `crypto.randomUUID()` — collision probability negligible |
| Screenshot abuse (large files) | MEDIUM | Client-side compression + Supabase Storage max file size policy (set to 5MB) |
| Auth.js v5 instability | MEDIUM | Pin to a specific v5 beta tag; document upgrade path |
| Upstash free tier limits (10k commands/day) | LOW | Our traffic volume at launch is well under this |
| Discord OAuth rate limits | LOW | Not a concern at MVP scale |
| Mod acting on own application | MEDIUM | API enforces: `reviewedBy !== userId` on roster applications |

---

## 11. Implementation Order

This is the sequence that minimizes blocked work:

1. **Project init** — `create-next-app`, Tailwind, folder structure
2. **DB schema + migrations** — Drizzle schema, `drizzle-kit push` to Supabase
3. **Auth** — Auth.js v5 Discord provider, session callbacks, middleware
4. **Core API routes** — roster, teams, tournaments, submissions (no rate limiting yet)
5. **Scoring logic + tests** — pure functions, full unit test coverage
6. **Upload flow** — signed URL endpoint + client compression
7. **Pages + components** — landing, roster, leaderboard, tournaments, dashboard, admin
8. **Rate limiting** — Upstash wired in after core routes are stable
9. **Notifications** — last, since they depend on all other mutation flows
10. **OBS Host View** — simple, fast to build once leaderboard is done
11. **Prize pool config** — admin settings, landing page progress bar
12. **E2E tests** — Playwright covering the Register → Play → Rank flow
```
