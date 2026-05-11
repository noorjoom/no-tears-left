# Product Requirements Document — No Tears Left (NTL) MVP

**Version:** 1.0  
**Date:** 2026-04-24  
**Author:** Noor  
**Status:** Draft

---

## 1. Overview

No Tears Left (NTL) is a community-driven organization for the Fortnite Zero Build (ZB) competitive scene. The MVP website serves two distinct purposes:

1. **Community Hub** — A public-facing presence that lets anyone follow NTL and apply for the official roster.
2. **Tournament Platform** — A self-service system for running Kill Race tournaments, including team registration, score submission, and leaderboard tracking.

These are intentionally separate: a player can enter a tournament without being on the roster, and a roster member does not need to be in any active tournament.

---

## 2. Goals & Non-Goals

### Goals (MVP)
- Let users log in via Discord and participate in the community.
- Allow players to apply for the NTL roster; mods approve/reject applications.
- Let Captains create Duo teams, invite a partner, register for tournaments, and submit scores.
- Give mods a dashboard to manage roster applications, verify scores, and create tournaments.
- Display a cumulative leaderboard across all tournaments.
- Provide a streamer-friendly OBS Host View of the top 5 teams.
- Show a Ko-Fi-linked prize pool progress bar.

### Non-Goals (post-MVP)
- Solos or squad formats.
- In-app payment processing (Ko-Fi link only).
- Automated score verification (screenshot OCR, API integration).
- Bracket/elimination formats.
- Mobile-native app.

---

## 3. Users & Roles

| Role | How Assigned | Capabilities |
|------|-------------|--------------|
| **Guest** | Not logged in | View landing page, leaderboard, roster list |
| **Member** | Logged in via Discord | All Guest actions + apply for roster, register for tournaments as Captain, submit scores |
| **Partner** | Joined a team via invite link | All Member actions within their team |
| **Mod** | Assigned by Admin | All Member actions + approve/reject roster apps, verify/reject score submissions, create tournaments |
| **Admin** | Hardcoded (you + 1) | All Mod actions + assign Mod role, configure tournament settings, set prize pool goal |

> **Auth rule:** Discord OAuth is the only login method. A Discord account is required to participate beyond read-only browsing.

---

## 4. Core Features

### 4.1 Landing Page (Public)

- Hero section: NTL branding, tagline, and a CTA to "Join the Community" (Discord login).
- Brief explanation of what NTL is and what Zero Build competitive looks like.
- Links to: Leaderboard, Roster, and active Tournament.
- Prize Pool progress bar: displays current Ko-Fi fundraising goal (set by Admin), links out to Ko-Fi page.

### 4.2 Authentication

- Discord OAuth via Auth.js (NextAuth).
- On first login, create a `users` record seeded with Discord ID, username, and avatar.
- Session stored securely; role fetched from DB on each request.
- No email/password fallback.

### 4.3 Roster

#### Public Roster Page
- Lists all approved NTL roster members.
- Shows Discord username, avatar, and join date.
- "Apply for the Roster" button (requires login).

#### Roster Application Flow
1. Logged-in Member fills out an application form:
   - **Epic Games Username** (required)
   - **Fortnite platform** (PC / Console) (required)
   - **Time zone** (required)
   - **Why do you want to join NTL?** — freetext, max 500 chars (required)
   - **Link to VOD or clip** — URL, optional
2. Application enters a pending queue visible to Mods and Admins.
3. Mod reviews and either **approves** (user's role updated, they appear on roster) or **rejects** (with an optional note).
4. Applicant is notified on their dashboard of the decision. No email — dashboard notification only.
5. Rejected applicants may re-apply after a 30-day cooldown.

#### Constraints
- One active application per user at a time.
- Existing roster members cannot re-apply.

### 4.4 Tournaments

#### Tournament Lifecycle (Admin/Mod creates → players register → window opens → submissions → results)

**Tournament object fields:**
- Name
- Description
- Registration deadline
- Tournament window (start datetime → end datetime)
- Max teams (optional cap)
- Status: `draft | open | in_progress | closed | archived`

#### Team Registration
1. Any logged-in user can become a **Captain** by creating a Duo team for an open tournament.
2. Captain generates a unique invite link (expires after 48 hours or when partner joins — whichever comes first).
3. Partner clicks link, logs in with Discord, and joins the team.
4. Team is locked once both slots are filled. A Captain may remove a Partner before the tournament window opens.
5. A player may only be on one team per tournament.

#### Score Submission
- Only the **Captain** submits for the team.
- Submission form fields:
  - **Match ID** — text (used for deduplication)
  - **Eliminations** — integer ≥ 0
  - **Placement** — integer 1–100
  - **Screenshot** — image upload (compressed client-side before upload to Supabase Storage)
- A team may submit multiple match results within the tournament window.
- Duplicate guard: `(match_id, team_id)` unique constraint at DB level.
- Submissions are `pending` until a Mod verifies them.

#### Scoring Formula
- **Elimination points:** 1 pt per kill.
- **Placement bonus:**
  - 1st: 10 pts
  - 2nd–3rd: 7 pts
  - 4th–5th: 5 pts
  - 6th–10th: 3 pts
  - 11th–25th: 1 pt
  - 26th+: 0 pts
- **Team score per match** = Eliminations + Placement Bonus.
- **Cumulative leaderboard score** = sum of all verified match scores across all tournaments.

### 4.5 Leaderboard

- Public page, no login required.
- Displays all teams with at least one verified score.
- Columns: Rank, Team Name, Captain, Partner, Total Points, Tournaments Played.
- Manually refreshed (no real-time subscription for MVP).
- **Host View** (`/leaderboard/host`): a clean, minimal page showing the Top 5 teams. Designed as an OBS Browser Source — no nav, large text, dark background. Manually refreshed.

### 4.6 Member Dashboard

Accessible after Discord login. Sections:

- **My Application** — status of roster application (or link to apply).
- **My Teams** — list of tournaments the member is registered in, with team status and submission count.
- **Notifications** — in-app only. Events that trigger notifications:
  - Roster application approved/rejected.
  - Score submission verified/rejected (with optional mod note).
  - Invite link accepted by a partner.

### 4.7 Moderator Queue

Route: `/mod` — protected; `MOD` and `ADMIN` roles only. Tab switcher with three sections:

#### Roster Tab
- List of pending applications with Discord username, Epic username, platform, timezone, and their written answer.
- Approve or Reject buttons. Reject shows an optional note field.

#### Submissions Tab
- Side-by-side view: screenshot on the left, submitted data on the right.
- **Verify** or **Reject** buttons. Reject sends a notification to the Captain.

#### History Tab
- Audit log of completed roster actions: which mod approved/rejected, timestamp, and review note.
- Audit log of completed submission actions: which mod verified/rejected, timestamp, and review note.

### 4.8 Tournament Management (MOD/ADMIN)

Route: `/mod/tournaments` — list all tournaments including DRAFT status. MODs can create, edit, and publish tournaments.

- `/mod/tournaments/new` — Create tournament form (name, description, registration deadline, window, max teams).
- `/mod/tournaments/[id]/edit` — Edit tournament details and change status (DRAFT → OPEN → IN_PROGRESS → CLOSED → ARCHIVED).

### 4.9 Admin Settings

Route: `/admin/settings` — protected; `ADMIN` role only. Tab switcher with two sections:

#### Roles Tab
- Search for users by Discord username.
- Promote MEMBERs to MOD or demote MODs back to MEMBER.
- ADMINs are immutable (no self-demotion, cannot change other ADMINs).

#### Prize Pool Tab
- Set the Ko-Fi goal amount (displayed on landing page progress bar).
- Input the current Ko-Fi raised amount (manually updated for MVP — no API).
- Update the Ko-Fi link shown on the landing page.

### 4.10 Admin Overview

Route: `/admin` — protected; `ADMIN` role only.
- Dashboard page linking to role management, prize pool settings, mod queue, and tournament management.
- Quick navigation for admin workflows.

---

## 5. Data Model (High-Level)

```
users
  id, discord_id, discord_username, discord_avatar, role, created_at

roster_applications
  id, user_id, epic_username, platform, timezone, why_text, vod_url,
  status (pending|approved|rejected), reviewed_by, review_note, reviewed_at, created_at

tournaments
  id, name, description, registration_deadline, starts_at, ends_at,
  max_teams, status, created_by, created_at

teams
  id, tournament_id, captain_id, partner_id, name, invite_token, invite_expires_at, created_at

submissions
  id, team_id, tournament_id, match_id, eliminations, placement,
  screenshot_url, status (pending|verified|rejected), reviewed_by,
  review_note, reviewed_at, submitted_at
  UNIQUE (match_id, team_id)

notifications
  id, user_id, type, message, read, created_at

prize_pool_config
  id, goal_amount, current_amount, ko_fi_url, updated_at, updated_by
```

---

## 6. Design System

### Color Palette
Derived from the NTL logo assets — molten chrome on pitch black.

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-base` | `#000000` | Page background |
| `--bg-surface` | `#0a0a0a` | Cards, panels |
| `--bg-elevated` | `#111111` | Modals, dropdowns |
| `--border` | `#1f1f1f` | Dividers, input borders |
| `--text-primary` | `#e8e8e8` | Body text |
| `--text-muted` | `#6b6b6b` | Labels, secondary info |
| `--accent` | `#a8c8e8` | CTA buttons, links, highlights (the icy blue iridescent from the logo) |
| `--accent-bright` | `#c8e0f4` | Hover states |
| `--chrome` | `#d4d4d4` | Chrome-effect UI elements |

### Typography
- **Display / Logo text:** Match the gothic blackletter style of the logo where used for headings.
- **Body:** Clean sans-serif (e.g., Inter or Geist) — the blackletter is for brand moments only, not UI chrome.
- **Monospace:** Used for stats, scores, match IDs.

### Visual Principles
- Pitch black is the canvas. Everything sits on darkness.
- Chrome and ice-blue are the only accent colors — no warm tones.
- Specular highlights and subtle glow effects on key UI elements (buttons, rank badges).
- Drip motif from the logo can be used sparingly as a decorative separator.
- No gradients except linear dark-to-darker for depth.

---

## 7. Non-Functional Requirements

| Concern | Requirement |
|---------|------------|
| **Auth** | Discord OAuth only; sessions via Auth.js |
| **Route protection** | Middleware guards `/admin/*` to MOD/ADMIN; `/dashboard/*` to any authenticated user |
| **Anti-cheat** | DB unique constraint on `(match_id, team_id)`; screenshot required on every submission |
| **Rate limiting** | Upstash rate limiting on: registration endpoint, submission endpoint, application endpoint |
| **Image handling** | Client-side compression before upload; Supabase Storage buckets |
| **Styling** | Tailwind CSS; design system defined in Section 6 |
| **Hosting** | Vercel (Next.js App Router); Supabase (PostgreSQL + Storage) |

---

## 8. Page Map

| Path | Access | Description |
|------|--------|-------------|
| `/` | Public | Landing page |
| `/roster` | Public | Approved roster member list |
| `/roster/apply` | Logged in | Application form |
| `/leaderboard` | Public | Cumulative leaderboard |
| `/leaderboard/host` | Public | OBS Host View (Top 5) |
| `/tournaments` | Public | List of all tournaments |
| `/tournaments/[id]` | Public | Tournament detail + team list |
| `/dashboard` | Logged in | Member dashboard (notifications, teams, application status) |
| `/mod` | MOD/ADMIN | Moderator queue with tabs: roster (pending apps), submissions (pending scores), history (audit log) |
| `/mod/tournaments` | MOD/ADMIN | Tournament list (includes DRAFT status) with create/edit forms |
| `/mod/tournaments/new` | MOD/ADMIN | Create new tournament form |
| `/mod/tournaments/[id]/edit` | MOD/ADMIN | Edit tournament and change status |
| `/admin` | ADMIN | Admin overview linking to settings and mod tools |
| `/admin/settings` | ADMIN | Settings with tabs: roles (promote/demote MODs), prize-pool (Ko-fi goal/amount/link) |

---

## 9. Out of Scope (Explicit Deferrals)

- Email or push notifications (in-app only for MVP).
- Solos or squad formats.
- Stripe or any payment processing (Ko-Fi link only).
- Automated screenshot verification.
- Season/split management.
- Public team/player profile pages (roster list is sufficient for MVP).
- Affiliate link tracking.

---

## 10. Resolved Design Decisions

| Question | Decision |
|----------|----------|
| Accent color | Icy blue (`#a8c8e8`) pulled from logo iridescence; pitch black background |
| Rejected applicants | See the mod's rejection note |
| Submission cap per team | Unlimited within the tournament window — all verified submissions count toward cumulative score |
| Invite link type | Single-use; expires after 48 hours or when partner joins |
