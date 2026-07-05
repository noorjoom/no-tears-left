import { Pool } from 'pg';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { applyEnvFile } from './helpers/load-env';

/**
 * Deterministic E2E seed — committed test infrastructure. Fixed UUIDs/tokens so
 * specs can reference exact rows. Idempotent: truncates all tables then inserts.
 *
 * Fixture layout (kept disjoint per spec so fullyParallel runs don't collide):
 *   - tournA (no team) -> teams.spec  (captain creates, partner joins via UI token)
 *   - tournB + teamB  -> submission.spec  (mod enters a match result)
 *   - tournC + teamC  -> public.spec leaderboard (pre-verified submission)
 *   - rosterMember    -> public.spec roster grid (approved application)
 *   - freshApplicant  -> roster.spec (no application yet; applies in-test)
 */

// ── Fixed identifiers (importable by specs) ──────────────────────────────────
export const E2E_IDS = {
  admin: '00000000-0000-4000-8000-000000000001',
  mod: '00000000-0000-4000-8000-000000000002',
  captain: '00000000-0000-4000-8000-000000000003',
  partner: '00000000-0000-4000-8000-000000000004',
  freshApplicant: '00000000-0000-4000-8000-000000000005',
  rosterMember: '00000000-0000-4000-8000-000000000006',
  leaderboardCaptain: '00000000-0000-4000-8000-000000000007',
  tournA: '00000000-0000-4000-8000-0000000000a1',
  tournB: '00000000-0000-4000-8000-0000000000a2',
  tournC: '00000000-0000-4000-8000-0000000000a3',
  teamB: '00000000-0000-4000-8000-0000000000b2',
  teamC: '00000000-0000-4000-8000-0000000000b3',
} as const;

export const E2E_DISCORD = {
  admin: 'e2e-admin-discord',
  mod: 'e2e-mod-discord',
  captain: 'e2e-captain-discord',
  partner: 'e2e-partner-discord',
  freshApplicant: 'e2e-fresh-discord',
  rosterMember: 'e2e-roster-discord',
  leaderboardCaptain: 'e2e-leaderboard-discord',
} as const;

export const E2E_ROSTER_EPIC = 'RosterRandy';
export const E2E_LEADERBOARD_TEAM_NAME = 'Leaderboard Legends';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export async function seedE2E(db: NodePgDatabase<typeof schema>): Promise<void> {
  const now = Date.now();
  const past = new Date(now - DAY);
  const future = new Date(now + 7 * DAY);
  const farFuture = new Date(now + 30 * DAY);

  // Wipe everything first so the seed is idempotent across runs.
  await truncateAll(db);

  await db.insert(schema.users).values([
    { id: E2E_IDS.admin, discordId: E2E_DISCORD.admin, discordUsername: 'E2E Admin', role: 'ADMIN' },
    { id: E2E_IDS.mod, discordId: E2E_DISCORD.mod, discordUsername: 'E2E Mod', role: 'MOD' },
    { id: E2E_IDS.captain, discordId: E2E_DISCORD.captain, discordUsername: 'E2E Captain', role: 'MEMBER' },
    { id: E2E_IDS.partner, discordId: E2E_DISCORD.partner, discordUsername: 'E2E Partner', role: 'MEMBER' },
    { id: E2E_IDS.freshApplicant, discordId: E2E_DISCORD.freshApplicant, discordUsername: 'Fresh Freddy', role: 'MEMBER' },
    { id: E2E_IDS.rosterMember, discordId: E2E_DISCORD.rosterMember, discordUsername: 'Roster Randy', role: 'MEMBER' },
    { id: E2E_IDS.leaderboardCaptain, discordId: E2E_DISCORD.leaderboardCaptain, discordUsername: 'LB Captain', role: 'MEMBER' },
  ]);

  await db.insert(schema.tournaments).values([
    {
      id: E2E_IDS.tournA,
      name: 'E2E Open Cup (Teams)',
      description: 'Open tournament for team-join E2E.',
      registrationDeadline: future,
      startsAt: past,
      endsAt: future,
      status: 'OPEN',
      createdBy: E2E_IDS.admin,
    },
    {
      id: E2E_IDS.tournB,
      name: 'E2E Open Cup (Submissions)',
      description: 'Open tournament with a live submission window.',
      registrationDeadline: future,
      startsAt: past,
      endsAt: farFuture,
      status: 'OPEN',
      createdBy: E2E_IDS.admin,
    },
    {
      id: E2E_IDS.tournC,
      name: 'E2E Closed Cup (Leaderboard)',
      description: 'Closed tournament with a verified result.',
      registrationDeadline: past,
      startsAt: past,
      endsAt: past,
      status: 'CLOSED',
      createdBy: E2E_IDS.admin,
    },
  ]);

  await db.insert(schema.teams).values([
    {
      id: E2E_IDS.teamB,
      tournamentId: E2E_IDS.tournB,
      captainId: E2E_IDS.captain,
      partnerId: E2E_IDS.partner,
      name: 'Team Bravo',
      inviteToken: null,
      inviteExpiresAt: null,
    },
    {
      id: E2E_IDS.teamC,
      tournamentId: E2E_IDS.tournC,
      captainId: E2E_IDS.leaderboardCaptain,
      partnerId: null,
      name: E2E_LEADERBOARD_TEAM_NAME,
      inviteToken: null,
      inviteExpiresAt: null,
    },
  ]);

  // Pre-verified submission so the public leaderboard always has a stable row.
  await db.insert(schema.submissions).values({
    teamId: E2E_IDS.teamC,
    tournamentId: E2E_IDS.tournC,
    matchId: 'e2e-seed-match-c',
    eliminations: 5,
    placement: 1, // 5 elims + 10 placement bonus = 15 pts
    screenshotUrl: 'https://e2e.supabase.co/seed-screenshot.png',
    status: 'VERIFIED',
    reviewedBy: E2E_IDS.mod,
    reviewedAt: past,
  });

  // Approved roster application -> visible on public /roster.
  await db.insert(schema.rosterApplications).values({
    userId: E2E_IDS.rosterMember,
    epicUsername: E2E_ROSTER_EPIC,
    platform: 'PC',
    timezone: 'America/New_York',
    whyText: 'Seeded approved roster member for E2E.',
    status: 'APPROVED',
    reviewedBy: E2E_IDS.mod,
    reviewedAt: past,
  });

  await db.insert(schema.prizePoolConfig).values({
    goalAmount: 1000,
    currentAmount: 250,
    koFiUrl: 'https://ko-fi.com/e2e',
    updatedBy: E2E_IDS.admin,
  });
}

async function truncateAll(db: NodePgDatabase<typeof schema>): Promise<void> {
  const { sql } = await import('drizzle-orm');
  await db.execute(
    sql`TRUNCATE TABLE
      submissions, notifications, teams, roster_applications,
      tournaments, prize_pool_config, users
      RESTART IDENTITY CASCADE`,
  );
}

/** Standalone runner: `tsx tests/e2e/seed.ts` (used by global-setup). */
export async function runSeed(): Promise<void> {
  applyEnvFile('.env.e2e');
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set for E2E seed');
  if (!/localhost|127\.0\.0\.1/.test(url)) {
    throw new Error(`Refusing to seed non-local DB: ${url}`);
  }
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });
  try {
    await seedE2E(db);
  } finally {
    await pool.end();
  }
}

// Allow direct execution.
if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  runSeed()
    .then(() => {
      console.log('E2E seed complete');
      process.exit(0);
    })
    .catch((err) => {
      console.error('E2E seed failed', err);
      process.exit(1);
    });
}
