// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb, type TestDbHandle } from './db-test';
import { getCumulativeLeaderboard } from './leaderboard-service';
import { submissions, teams, tournaments, users } from '@/db/schema';

async function seedUser(h: TestDbHandle, discordId: string, name: string) {
  const [u] = await h.db
    .insert(users)
    .values({ discordId, discordUsername: name })
    .returning();
  return u;
}

async function seedTournament(h: TestDbHandle, createdBy: string) {
  const [t] = await h.db
    .insert(tournaments)
    .values({
      name: 'Cup',
      registrationDeadline: new Date('2026-04-20T00:00:00Z'),
      startsAt: new Date('2026-04-22T00:00:00Z'),
      endsAt: new Date('2026-04-30T00:00:00Z'),
      status: 'CLOSED',
      createdBy,
    })
    .returning();
  return t;
}

async function seedTeam(
  h: TestDbHandle,
  tournamentId: string,
  captainId: string,
  partnerId: string | null,
  name: string,
) {
  const [team] = await h.db
    .insert(teams)
    .values({ tournamentId, captainId, partnerId, name })
    .returning();
  return team;
}

async function seedSub(
  h: TestDbHandle,
  teamId: string,
  tournamentId: string,
  matchId: string,
  eliminations: number,
  placement: number,
  status: 'PENDING' | 'VERIFIED' | 'REJECTED' = 'VERIFIED',
) {
  const [s] = await h.db
    .insert(submissions)
    .values({
      teamId,
      tournamentId,
      matchId,
      eliminations,
      placement,
      screenshotUrl: 'u',
      status,
    })
    .returning();
  return s;
}

describe('leaderboard-service', () => {
  let h: TestDbHandle;
  beforeEach(async () => {
    h = await createTestDb();
  });
  afterEach(async () => {
    await h.close();
  });

  it('aggregates VERIFIED submissions across tournaments per team', async () => {
    const cap = await seedUser(h, '1', 'cap');
    const par = await seedUser(h, '2', 'par');
    const t = await seedTournament(h, cap.id);
    const team = await seedTeam(h, t.id, cap.id, par.id, 'Team A');
    // 5 elims + 1st (10) = 15; 3 elims + 4th (5) = 8; total 23
    await seedSub(h, team.id, t.id, 'm1', 5, 1);
    await seedSub(h, team.id, t.id, 'm2', 3, 4);

    const board = await getCumulativeLeaderboard(h.db);
    expect(board).toHaveLength(1);
    expect(board[0].teamName).toBe('Team A');
    expect(board[0].totalPoints).toBe(23);
    expect(board[0].matches).toBe(2);
    expect(board[0].captainUsername).toBe('cap');
    expect(board[0].partnerUsername).toBe('par');
  });

  it('excludes PENDING and REJECTED submissions', async () => {
    const cap = await seedUser(h, '1', 'cap');
    const t = await seedTournament(h, cap.id);
    const team = await seedTeam(h, t.id, cap.id, null, 'Team A');
    await seedSub(h, team.id, t.id, 'm1', 10, 1, 'VERIFIED'); // 20
    await seedSub(h, team.id, t.id, 'm2', 5, 1, 'PENDING'); // ignored
    await seedSub(h, team.id, t.id, 'm3', 7, 1, 'REJECTED'); // ignored

    const board = await getCumulativeLeaderboard(h.db);
    expect(board).toHaveLength(1);
    expect(board[0].totalPoints).toBe(20);
    expect(board[0].matches).toBe(1);
  });

  it('orders by totalPoints DESC then matches DESC', async () => {
    const cap1 = await seedUser(h, '1', 'a');
    const cap2 = await seedUser(h, '2', 'b');
    const cap3 = await seedUser(h, '3', 'c');
    const t = await seedTournament(h, cap1.id);
    const teamA = await seedTeam(h, t.id, cap1.id, null, 'A');
    const teamB = await seedTeam(h, t.id, cap2.id, null, 'B');
    const teamC = await seedTeam(h, t.id, cap3.id, null, 'C');
    await seedSub(h, teamA.id, t.id, 'm1', 5, 1); // 15
    await seedSub(h, teamB.id, t.id, 'm1', 10, 10); // 13
    await seedSub(h, teamC.id, t.id, 'm1', 8, 1); // 18

    const board = await getCumulativeLeaderboard(h.db);
    expect(board.map((r) => r.teamName)).toEqual(['C', 'A', 'B']);
  });

  it('returns empty array when no verified submissions', async () => {
    const cap = await seedUser(h, '1', 'cap');
    const t = await seedTournament(h, cap.id);
    await seedTeam(h, t.id, cap.id, null, 'Team A');
    const board = await getCumulativeLeaderboard(h.db);
    expect(board).toEqual([]);
  });

  it('aggregates two tournaments for the same team captain', async () => {
    const cap = await seedUser(h, '1', 'cap');
    const t1 = await seedTournament(h, cap.id);
    const t2 = await seedTournament(h, cap.id);
    const team1 = await seedTeam(h, t1.id, cap.id, null, 'Team A1');
    const team2 = await seedTeam(h, t2.id, cap.id, null, 'Team A2');
    await seedSub(h, team1.id, t1.id, 'm1', 5, 1); // 15
    await seedSub(h, team2.id, t2.id, 'm1', 3, 1); // 13

    const board = await getCumulativeLeaderboard(h.db);
    // Two distinct team rows since team identity is per-tournament.
    expect(board).toHaveLength(2);
    expect(board[0].totalPoints + board[1].totalPoints).toBe(28);
  });
});
