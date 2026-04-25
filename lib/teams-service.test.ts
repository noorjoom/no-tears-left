// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb, type TestDbHandle } from './db-test';
import {
  createTeam,
  deleteTeam,
  getTeamForMember,
  joinTeam,
} from './teams-service';
import { teams, tournaments, users } from '@/db/schema';

async function seedUser(h: TestDbHandle, discordId: string, name: string): Promise<string> {
  const [u] = await h.db
    .insert(users)
    .values({ discordId, discordUsername: name })
    .returning();
  return u.id;
}

interface SeedTournamentOpts {
  status?: 'DRAFT' | 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | 'ARCHIVED';
  startsAt?: Date;
}

async function seedTournament(
  h: TestDbHandle,
  creatorId: string,
  opts: SeedTournamentOpts = {},
): Promise<string> {
  const startsAt = opts.startsAt ?? new Date('2026-12-01T00:00:00Z');
  const [t] = await h.db
    .insert(tournaments)
    .values({
      name: 'Test Tourney',
      registrationDeadline: new Date('2026-11-30T00:00:00Z'),
      startsAt,
      endsAt: new Date(startsAt.getTime() + 24 * 60 * 60 * 1000),
      status: opts.status ?? 'OPEN',
      createdBy: creatorId,
    })
    .returning();
  return t.id;
}

describe('teams-service', () => {
  let h: TestDbHandle;
  beforeEach(async () => {
    h = await createTestDb();
  });
  afterEach(async () => {
    await h.close();
  });

  describe('createTeam', () => {
    it('creates a team with invite token + 48h expiry', async () => {
      const captain = await seedUser(h, '1', 'cap');
      const tId = await seedTournament(h, captain);
      const now = new Date('2026-04-25T00:00:00Z');
      const result = await createTeam(
        h.db,
        { tournamentId: tId, captainId: captain, name: 'Team A' },
        now,
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.inviteToken).toMatch(/^[0-9a-f-]{36}$/i);
        const ttl = result.value.inviteExpiresAt!.getTime() - now.getTime();
        expect(ttl).toBe(48 * 60 * 60 * 1000);
      }
    });

    it('rejects when tournament is not OPEN', async () => {
      const captain = await seedUser(h, '1', 'cap');
      const tId = await seedTournament(h, captain, { status: 'DRAFT' });
      const result = await createTeam(h.db, {
        tournamentId: tId, captainId: captain, name: 'X',
      });
      expect(result).toEqual({ ok: false, error: 'TOURNAMENT_NOT_OPEN' });
    });

    it('rejects when tournament missing', async () => {
      const captain = await seedUser(h, '1', 'cap');
      const result = await createTeam(h.db, {
        tournamentId: '00000000-0000-0000-0000-000000000000',
        captainId: captain,
        name: 'X',
      });
      expect(result).toEqual({ ok: false, error: 'TOURNAMENT_NOT_FOUND' });
    });

    it('rejects when user is already on a team in this tournament', async () => {
      const captain = await seedUser(h, '1', 'cap');
      const tId = await seedTournament(h, captain);
      await createTeam(h.db, { tournamentId: tId, captainId: captain, name: 'A' });
      const result = await createTeam(h.db, {
        tournamentId: tId, captainId: captain, name: 'B',
      });
      expect(result).toEqual({ ok: false, error: 'ALREADY_ON_TEAM' });
    });
  });

  describe('joinTeam', () => {
    it('partner joins via invite token; token cleared', async () => {
      const captain = await seedUser(h, '1', 'cap');
      const partner = await seedUser(h, '2', 'p');
      const tId = await seedTournament(h, captain);
      const created = await createTeam(h.db, {
        tournamentId: tId, captainId: captain, name: 'A',
      });
      if (!created.ok) throw new Error('seed failed');
      const result = await joinTeam(h.db, created.value.inviteToken!, partner);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.partnerId).toBe(partner);
        expect(result.value.inviteToken).toBeNull();
      }
    });

    it('rejects expired token', async () => {
      const captain = await seedUser(h, '1', 'cap');
      const partner = await seedUser(h, '2', 'p');
      const tId = await seedTournament(h, captain);
      const created = await createTeam(
        h.db,
        { tournamentId: tId, captainId: captain, name: 'A' },
        new Date('2026-04-01T00:00:00Z'),
      );
      if (!created.ok) throw new Error('seed failed');
      const result = await joinTeam(
        h.db,
        created.value.inviteToken!,
        partner,
        new Date('2026-04-10T00:00:00Z'),
      );
      expect(result).toEqual({ ok: false, error: 'EXPIRED' });
    });

    it('rejects invalid token', async () => {
      const u = await seedUser(h, '1', 'u');
      const result = await joinTeam(h.db, 'not-a-real-token', u);
      expect(result).toEqual({ ok: false, error: 'INVALID_TOKEN' });
    });

    it('captain cannot join own team', async () => {
      const captain = await seedUser(h, '1', 'cap');
      const tId = await seedTournament(h, captain);
      const created = await createTeam(h.db, {
        tournamentId: tId, captainId: captain, name: 'A',
      });
      if (!created.ok) throw new Error('seed failed');
      const result = await joinTeam(h.db, created.value.inviteToken!, captain);
      expect(result).toEqual({ ok: false, error: 'CANNOT_JOIN_OWN' });
    });

    it('rejects when user already on a team in same tournament', async () => {
      const captainA = await seedUser(h, '1', 'a');
      const captainB = await seedUser(h, '2', 'b');
      const partner = await seedUser(h, '3', 'p');
      const tId = await seedTournament(h, captainA);

      const teamA = await createTeam(h.db, {
        tournamentId: tId, captainId: captainA, name: 'A',
      });
      const teamB = await createTeam(h.db, {
        tournamentId: tId, captainId: captainB, name: 'B',
      });
      if (!teamA.ok || !teamB.ok) throw new Error('seed failed');

      const first = await joinTeam(h.db, teamA.value.inviteToken!, partner);
      expect(first.ok).toBe(true);
      const second = await joinTeam(h.db, teamB.value.inviteToken!, partner);
      expect(second).toEqual({ ok: false, error: 'ALREADY_ON_TEAM' });
    });
  });

  describe('deleteTeam', () => {
    it('captain deletes before tournament starts', async () => {
      const captain = await seedUser(h, '1', 'cap');
      const tId = await seedTournament(h, captain, {
        startsAt: new Date('2026-12-01T00:00:00Z'),
      });
      const created = await createTeam(h.db, {
        tournamentId: tId, captainId: captain, name: 'A',
      });
      if (!created.ok) throw new Error('seed failed');
      const result = await deleteTeam(
        h.db,
        created.value.id,
        captain,
        new Date('2026-04-25T00:00:00Z'),
      );
      expect(result.ok).toBe(true);
      const remaining = await h.db.select().from(teams);
      expect(remaining).toHaveLength(0);
    });

    it('non-captain cannot delete', async () => {
      const captain = await seedUser(h, '1', 'cap');
      const stranger = await seedUser(h, '2', 'x');
      const tId = await seedTournament(h, captain);
      const created = await createTeam(h.db, {
        tournamentId: tId, captainId: captain, name: 'A',
      });
      if (!created.ok) throw new Error('seed failed');
      const result = await deleteTeam(h.db, created.value.id, stranger);
      expect(result).toEqual({ ok: false, error: 'NOT_CAPTAIN' });
    });

    it('cannot delete after tournament started', async () => {
      const captain = await seedUser(h, '1', 'cap');
      const tId = await seedTournament(h, captain, {
        startsAt: new Date('2026-04-01T00:00:00Z'),
      });
      const created = await createTeam(h.db, {
        tournamentId: tId, captainId: captain, name: 'A',
      });
      if (!created.ok) throw new Error('seed failed');
      const result = await deleteTeam(
        h.db,
        created.value.id,
        captain,
        new Date('2026-04-25T00:00:00Z'),
      );
      expect(result).toEqual({ ok: false, error: 'TOURNAMENT_STARTED' });
    });
  });

  describe('getTeamForMember', () => {
    it('returns team for captain', async () => {
      const captain = await seedUser(h, '1', 'cap');
      const tId = await seedTournament(h, captain);
      const created = await createTeam(h.db, {
        tournamentId: tId, captainId: captain, name: 'A',
      });
      if (!created.ok) throw new Error('seed failed');
      const result = await getTeamForMember(h.db, created.value.id, captain);
      expect(result.ok).toBe(true);
    });

    it('forbids non-member', async () => {
      const captain = await seedUser(h, '1', 'cap');
      const stranger = await seedUser(h, '2', 'x');
      const tId = await seedTournament(h, captain);
      const created = await createTeam(h.db, {
        tournamentId: tId, captainId: captain, name: 'A',
      });
      if (!created.ok) throw new Error('seed failed');
      const result = await getTeamForMember(h.db, created.value.id, stranger);
      expect(result).toEqual({ ok: false, error: 'FORBIDDEN' });
    });
  });
});
