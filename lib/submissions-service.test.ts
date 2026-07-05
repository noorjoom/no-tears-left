// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb, type TestDbHandle } from './db-test';
import {
  createVerifiedSubmission,
  listSubmissionsWithContext,
  updateSubmission,
} from './submissions-service';
import { users, teams, tournaments } from '@/db/schema';

interface Setup {
  captain: string;
  partner: string;
  mod: string;
  tournamentId: string;
  teamId: string;
}

async function setup(h: TestDbHandle, opts?: { startsAt?: Date; endsAt?: Date }): Promise<Setup> {
  const [cap] = await h.db.insert(users).values({ discordId: '1', discordUsername: 'cap' }).returning();
  const [par] = await h.db.insert(users).values({ discordId: '2', discordUsername: 'par' }).returning();
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

  describe('createVerifiedSubmission', () => {
    it('mod creates a VERIFIED submission within window', async () => {
      const s = await setup(h);
      const result = await createVerifiedSubmission(
        h.db,
        {
          teamId: s.teamId,
          matchId: 'm1',
          eliminations: 5,
          placement: 3,
          actorId: s.mod,
        },
        NOW,
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe('VERIFIED');
        expect(result.value.tournamentId).toBe(s.tournamentId);
        expect(result.value.reviewedBy).toBe(s.mod);
      }
    });

    it('mod can enter a result for their own team (no conflict-of-interest block)', async () => {
      const s = await setup(h);
      const result = await createVerifiedSubmission(
        h.db,
        { teamId: s.teamId, matchId: 'm1', eliminations: 1, placement: 1, actorId: s.captain },
        NOW,
      );
      expect(result.ok).toBe(true);
    });

    it('rejects when window closed (before start)', async () => {
      const s = await setup(h, {
        startsAt: new Date('2026-05-01T00:00:00Z'),
        endsAt: new Date('2026-05-02T00:00:00Z'),
      });
      const result = await createVerifiedSubmission(
        h.db,
        { teamId: s.teamId, matchId: 'm1', eliminations: 1, placement: 1, actorId: s.mod },
        NOW,
      );
      expect(result).toEqual({ ok: false, error: 'WINDOW_CLOSED' });
    });

    it('rejects when window closed (after end)', async () => {
      const s = await setup(h, {
        startsAt: new Date('2026-04-01T00:00:00Z'),
        endsAt: new Date('2026-04-10T00:00:00Z'),
      });
      const result = await createVerifiedSubmission(
        h.db,
        { teamId: s.teamId, matchId: 'm1', eliminations: 1, placement: 1, actorId: s.mod },
        NOW,
      );
      expect(result).toEqual({ ok: false, error: 'WINDOW_CLOSED' });
    });

    it('rejects duplicate (match_id, team_id)', async () => {
      const s = await setup(h);
      const first = await createVerifiedSubmission(
        h.db,
        { teamId: s.teamId, matchId: 'm1', eliminations: 1, placement: 1, actorId: s.mod },
        NOW,
      );
      expect(first.ok).toBe(true);
      const second = await createVerifiedSubmission(
        h.db,
        { teamId: s.teamId, matchId: 'm1', eliminations: 9, placement: 9, actorId: s.mod },
        NOW,
      );
      expect(second).toEqual({ ok: false, error: 'DUPLICATE_MATCH' });
    });

    it('returns TEAM_NOT_FOUND for missing team', async () => {
      const s = await setup(h);
      const result = await createVerifiedSubmission(
        h.db,
        { teamId: '00000000-0000-0000-0000-000000000000', matchId: 'm1',
          eliminations: 1, placement: 1, actorId: s.mod },
        NOW,
      );
      expect(result).toEqual({ ok: false, error: 'TEAM_NOT_FOUND' });
    });
  });

  describe('updateSubmission', () => {
    it('edits eliminations and placement on an existing submission', async () => {
      const s = await setup(h);
      const created = await createVerifiedSubmission(
        h.db,
        { teamId: s.teamId, matchId: 'm1', eliminations: 5, placement: 3, actorId: s.mod },
        NOW,
      );
      if (!created.ok) throw new Error('seed failed');

      const result = await updateSubmission(h.db, {
        submissionId: created.value.id,
        eliminations: 8,
        placement: 1,
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.eliminations).toBe(8);
        expect(result.value.placement).toBe(1);
      }
    });

    it('returns NOT_FOUND for unknown id', async () => {
      const result = await updateSubmission(h.db, {
        submissionId: '00000000-0000-0000-0000-000000000000',
        eliminations: 1,
      });
      expect(result).toEqual({ ok: false, error: 'NOT_FOUND' });
    });

    it('rejects rename to a duplicate (match_id, team_id)', async () => {
      const s = await setup(h);
      const first = await createVerifiedSubmission(
        h.db,
        { teamId: s.teamId, matchId: 'm1', eliminations: 1, placement: 1, actorId: s.mod },
        NOW,
      );
      const second = await createVerifiedSubmission(
        h.db,
        { teamId: s.teamId, matchId: 'm2', eliminations: 1, placement: 1, actorId: s.mod },
        NOW,
      );
      if (!first.ok || !second.ok) throw new Error('seed failed');

      const result = await updateSubmission(h.db, {
        submissionId: second.value.id,
        matchId: 'm1',
      });
      expect(result).toEqual({ ok: false, error: 'DUPLICATE_MATCH' });
    });
  });

  describe('listSubmissionsWithContext', () => {
    it('joins team and tournament for the mod history view', async () => {
      const s = await setup(h);
      const created = await createVerifiedSubmission(
        h.db,
        {
          teamId: s.teamId,
          matchId: 'm1',
          eliminations: 5,
          placement: 3,
          actorId: s.mod,
        },
        NOW,
      );
      if (!created.ok) throw new Error('seed failed');

      const list = await listSubmissionsWithContext(h.db);
      expect(list).toHaveLength(1);
      expect(list[0].teamName).toBe('Team A');
      expect(list[0].tournamentName).toBe('Cup');
      expect(list[0].reviewerUsername).toBe('mod');
    });
  });
});
