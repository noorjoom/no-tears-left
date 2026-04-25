import { eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { submissions, teams, tournaments, users } from '@/db/schema';
import type { RosterDb } from './roster-service';
import { calcMatchScore } from './scoring';

export interface LeaderboardRow {
  teamId: string;
  teamName: string;
  tournamentId: string;
  tournamentName: string;
  captainId: string;
  captainUsername: string;
  partnerId: string | null;
  partnerUsername: string | null;
  totalPoints: number;
  matches: number;
}

export async function getCumulativeLeaderboard(
  db: RosterDb,
): Promise<LeaderboardRow[]> {
  const captain = alias(users, 'captain');
  const partner = alias(users, 'partner');

  const rows = await db
    .select({
      teamId: teams.id,
      teamName: teams.name,
      tournamentId: tournaments.id,
      tournamentName: tournaments.name,
      captainId: captain.id,
      captainUsername: captain.discordUsername,
      partnerId: partner.id,
      partnerUsername: partner.discordUsername,
      eliminations: submissions.eliminations,
      placement: submissions.placement,
    })
    .from(submissions)
    .innerJoin(teams, eq(submissions.teamId, teams.id))
    .innerJoin(tournaments, eq(teams.tournamentId, tournaments.id))
    .innerJoin(captain, eq(teams.captainId, captain.id))
    .leftJoin(partner, eq(teams.partnerId, partner.id))
    .where(eq(submissions.status, 'VERIFIED'));

  const byTeam = new Map<string, LeaderboardRow>();
  for (const r of rows) {
    const points = calcMatchScore(r.eliminations, r.placement);
    const existing = byTeam.get(r.teamId);
    if (existing) {
      existing.totalPoints += points;
      existing.matches += 1;
    } else {
      byTeam.set(r.teamId, {
        teamId: r.teamId,
        teamName: r.teamName,
        tournamentId: r.tournamentId,
        tournamentName: r.tournamentName,
        captainId: r.captainId,
        captainUsername: r.captainUsername,
        partnerId: r.partnerId,
        partnerUsername: r.partnerUsername,
        totalPoints: points,
        matches: 1,
      });
    }
  }

  return Array.from(byTeam.values()).sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    return b.matches - a.matches;
  });
}
