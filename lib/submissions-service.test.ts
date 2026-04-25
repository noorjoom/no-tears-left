// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb, type TestDbHandle } from './db-test';
import {
  createSubmission,
  listSubmissionsByStatusWithContext,
  reviewSubmission,
} from './submissions-service';
import { submissions, teams, tournaments, users } from '@/db/schema';

interface Setup {
  captain: string;
  partner: string;
  outsider: string;
  mod: string;
  tournamentId: string;
  teamId: string;
}

async function setup(h: TestDbHandle, opts?: { startsAt?: Date; endsAt?: Date }): Promise<Setup> {
  const [cap] = await h.db.insert(users).values({ discordId: '1', discordUsername: 'cap' }).returning();
  const [par] = await h.db.insert(users).values({ discordId: '2', discordUsername: 'par' }).returning();
  const [out] = await h.db.insert(users).values({ discordId: '3', discordUsername: 'out' }).returning();
  const [mod] = await h.db.insert(users).values({ discordId: '4', discordUsername: 'mod', role: 'MOD' }).returning();
  const [t] = await h.db.insert(tournaments).values({
    name: 'Cup',
    registrationDeadline: new Date('2026-04-20T00:00:00Z'),
    startsAt: opts?.startsAt ?? new Date('2026-04-22T00:00:00Z'),
    endsAt: opts?.endsAt ?? new Date('2026-04-30T00:00:00Z'),
    status: 'IN_PROGRESS',
    createdBy: mod.id,
  }).returning();
  const [team] = await h.db.insert(teams).values({
    tournamentId: t.id,
    captainId: cap.id,
    partnerId: par.id,
    name: 'Team A',
  }).returning();
  return {
    captain: cap.id,
    partner: par.id,
    outsider: out.id,
    mod: mod.id,
    tournamentId: t.id,
    teamId: team.id,
  };
}

const NOW = new Date('2026-04-25T12:00:00Z');

describe('submissions-service', () => {
  let h: TestDbHandle;
  beforeEach(async () => {
    h = await createTestDb();
  });
  afterEach(async () => {
    await h.close();
  });

  describe('createSubmission', () => {
    it('captain creates a PENDING submission within window', async () => {
      const s = await setup(h);
      const result = await createSubmission(
        h.db,
        {
          teamId: s.teamId,
          matchId: 'm1',
          eliminations: 5,
          placement: 3,
          screenshotUrl: 'https://x/s.png',
          actorId: s.captain,
        },
        NOW,
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe('PENDING');
        expect(result.value.tournamentId).toBe(s.tournamentId);
      }
    });

    it('non-captain (partner) cannot submit', async () => {
      const s = await setup(h);
      const result = await createSubmission(
        h.db,
        { teamId: s.teamId, matchId: 'm1', eliminations: 1, placement: 1,
          screenshotUrl: 'u', actorId: s.partner },
        NOW,
      );
      expect(result).toEqual({ ok: false, error: 'NOT_CAPTAIN' });
    });

    it('rejects when window closed (before start)', async () => {
      const s = await setup(h, {
        startsAt: new Date('2026-05-01T00:00:00Z'),
        endsAt: new Date('2026-05-02T00:00:00Z'),
      });
      const result = await createSubmission(
        h.db,
        { teamId: s.teamId, matchId: 'm1', eliminations: 1, placement: 1,
          screenshotUrl: 'u', actorId: s.captain },
        NOW,
      );
      expect(result).toEqual({ ok: false, error: 'WINDOW_CLOSED' });
    });

    it('rejects when window closed (after end)', async () => {
      const s = await setup(h, {
        startsAt: new Date('2026-04-01T00:00:00Z'),
        endsAt: new Date('2026-04-10T00:00:00Z'),
      });
      const result = await createSubmission(
        h.db,
        { teamId: s.teamId, matchId: 'm1', eliminations: 1, placement: 1,
          screenshotUrl: 'u', actorId: s.captain },
        NOW,
      );
      expect(result).toEqual({ ok: false, error: 'WINDOW_CLOSED' });
    });

    it('rejects duplicate (match_id, team_id)', async () => {
      const s = await setup(h);
      const first = await createSubmission(
        h.db,
        { teamId: s.teamId, matchId: 'm1', eliminations: 1, placement: 1,
          screenshotUrl: 'u', actorId: s.captain },
        NOW,
      );
      expect(first.ok).toBe(true);
      const second = await createSubmission(
        h.db,
        { teamId: s.teamId, matchId: 'm1', eliminations: 9, placement: 9,
          screenshotUrl: 'u2', actorId: s.captain },
        NOW,
      );
      expect(second).toEqual({ ok: false, error: 'DUPLICATE_MATCH' });
    });

    it('returns TEAM_NOT_FOUND for missing team', async () => {
      const s = await setup(h);
      const result = await createSubmission(
        h.db,
        { teamId: '00000000-0000-0000-0000-000000000000', matchId: 'm1',
          eliminations: 1, placement: 1, screenshotUrl: 'u', actorId: s.captain },
        NOW,
      );
      expect(result).toEqual({ ok: false, error: 'TEAM_NOT_FOUND' });
    });
  });

  describe('reviewSubmission', () => {
    async function seedPendingSubmission(s: Setup) {
      const [sub] = await h.db.insert(submissions).values({
        teamId: s.teamId, tournamentId: s.tournamentId,
        matchId: 'm1', eliminations: 5, placement: 2,
        screenshotUrl: 'u',
      }).returning();
      return sub.id;
    }

    it('outsider mod verifies submission', async () => {
      const s = await setup(h);
      // promote outsider to MOD for this test
      await h.db.update(users).set({ role: 'MOD' }).where(eq(users.id, s.outsider));
      const subId = await seedPendingSubmission(s);
      const result = await reviewSubmission(h.db, {
        submissionId: subId, reviewerId: s.outsider, decision: 'VERIFIED',
      });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.status).toBe('VERIFIED');
    });

    it('captain (on team) cannot review own submission', async () => {
      const s = await setup(h);
      const subId = await seedPendingSubmission(s);
      const result = await reviewSubmission(h.db, {
        submissionId: subId, reviewerId: s.captain, decision: 'VERIFIED',
      });
      expect(result).toEqual({ ok: false, error: 'CONFLICT_OF_INTEREST' });
    });

    it('partner (on team) cannot review own team submission', async () => {
      const s = await setup(h);
      const subId = await seedPendingSubmission(s);
      const result = await reviewSubmission(h.db, {
        submissionId: subId, reviewerId: s.partner, decision: 'VERIFIED',
      });
      expect(result).toEqual({ ok: false, error: 'CONFLICT_OF_INTEREST' });
    });

    it('rejects when not pending', async () => {
      const s = await setup(h);
      const [sub] = await h.db.insert(submissions).values({
        teamId: s.teamId, tournamentId: s.tournamentId,
        matchId: 'm1', eliminations: 5, placement: 2,
        screenshotUrl: 'u', status: 'VERIFIED',
      }).returning();
      const result = await reviewSubmission(h.db, {
        submissionId: sub.id, reviewerId: s.mod, decision: 'REJECTED',
      });
      expect(result).toEqual({ ok: false, error: 'NOT_PENDING' });
    });

    it('returns NOT_FOUND for unknown id', async () => {
      const s = await setup(h);
      const result = await reviewSubmission(h.db, {
        submissionId: '00000000-0000-0000-0000-000000000000',
        reviewerId: s.mod,
        decision: 'VERIFIED',
      });
      expect(result).toEqual({ ok: false, error: 'NOT_FOUND' });
    });
  });

  describe('listSubmissionsByStatusWithContext', () => {
    it('joins team and tournament for the mod queue', async () => {
      const s = await setup(h);
      const created = await createSubmission(
        h.db,
        {
          teamId: s.teamId,
          matchId: 'm1',
          eliminations: 5,
          placement: 3,
          screenshotUrl: 'https://x/s.png',
          actorId: s.captain,
        },
        NOW,
      );
      if (!created.ok) throw new Error('seed failed');

      const queue = await listSubmissionsByStatusWithContext(h.db, 'PENDING');
      expect(queue).toHaveLength(1);
      expect(queue[0].teamName).toBe('Team A');
      expect(queue[0].tournamentName).toBe('Cup');
      expect(queue[0].captainId).toBe(s.captain);
      expect(queue[0].partnerId).toBe(s.partner);
    });
  });
});
