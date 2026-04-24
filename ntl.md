# No Tears Left (NTL) - Project Blueprint & MVP Roadmap

## 1. Project Vision
**No Tears Left** is a community-driven organization dedicated to the **Fortnite Zero Build (ZB)** competitive scene. The mission is to provide professional-grade infrastructure, tournaments, and a pro-roster pathway for a community that is currently underserved by build-centric events.

## 2. The MVP Core Loop (The "Register -> Play -> Rank" Flow)
The goal is to launch with a high-functioning, "frictionless" website that professionalizes the ZB experience.

### Technical Stack (Vercel + Supabase)
- **Frontend/Backend:** Next.js (App Router).
- **Authentication:** Discord OAuth (via Auth.js/NextAuth). Essential for linking player identities and Discord roles.
- **Database:** Supabase (PostgreSQL).
- **Storage:** Supabase Buckets (for tournament result screenshots).
- **Styling:** Tailwind CSS (Tactical/Minimalist aesthetic).

## 3. Organizational Roles & Logic
### User Roles (RBAC)
- **Captain (IGL):** The primary contact for a Duo. Responsible for team creation and result submission.
- **Partner:** Team member who joins via a unique invite link.
- **Mod:** Staff members with access to the Admin Dashboard to verify/reject scores.
- **Admin (You/Partner):** Full control over tournament settings and role assignments.

### Tournament Format: Kill Race (MVP Choice)
- **Logic:** Teams play public/ranked matches within a specific time window.
- **Submission:** The Captain uploads a screenshot of the match summary.
- **Verification:** Manual approval by Mods via the Admin Dashboard.

## 4. Key Website Features
### Dashboard
- **Team Management:** Generate invite links for partners.
- **Submission Portal:** Form for Captains to input `Kills`, `Placement`, and upload a `Screenshot`.

### Leaderboard
- **Manual Refresh:** Simplified for MVP to reduce compute costs.
- **Sorting Logic:** `Points = (Eliminations * 1) + PlacementBonus`.
- **Streamer Friendly:** A dedicated "Host View" (OBS Browser Source) URL showing the Top 5 teams with clean CSS for streamers to display.

### Admin Dashboard
- **Verification Queue:** Side-by-side view of screenshots and input fields.
- **Audit Log:** Tracks which Mod verified which score to ensure integrity.

## 5. Funding & Legal Strategy
- **The "No Entry Fee" Rule:** To comply with Epic Games' 2026 guidelines, NTL will not charge for tournament entry.
- **Community Funding:**
    - **Founder’s Pot:** A progress bar on the site showing a "Prize Pool Goal."
    - **Affiliate Links:** 100% of commissions go toward the tournament prize.
    - **Sponsor-a-Spot:** Hard-coding small brand logos into the leaderboard for "clout-based" sponsorships.
- **Payouts:** Use **Matcherino** or **Gifted V-Bucks/Skins** for the initial Founder's Tournament to simplify tax and legal paperwork.

## 6. Developer Guardrails (Anti-Cheat & Optimization)
- **Match ID Constraint:** Database-level unique constraint on `(match_id, team_id)` to prevent double submissions.
- **Image Compression:** Client-side compression before upload to save Supabase storage.
- **Ratelimiting:** Use Upstash to prevent spam on the registration and submission endpoints.
- **Middleware:** Protect `/admin` routes to ensure only users with the `MOD` or `ADMIN` role can access verification tools.

## 7. Next Steps
1. Initialize Next.js project and configure Discord OAuth.
2. Design the "Tactical" UI (Grays, Off-whites, Accent color).
3. Build the Duo Invite/Join system.
4. Set up the Admin Verification view.
5. Partner: Start outreach to ZB streamers for the "Founder's Invitational."
