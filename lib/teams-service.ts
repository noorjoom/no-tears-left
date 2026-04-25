import { and, eq, isNull, or } from 'drizzle-orm';
import { teams, tournaments } from '@/db/schema';
import type { RosterDb } from './roster-service';
import { INVITE_TOKEN_TTL_MS } from './constants';

export type ServiceResult<T, E = string> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export type CreateTeamError =
  | 'TOURNAMENT_NOT_FOUND'
  | 'TOURNAMENT_NOT_OPEN'
  | 'ALREADY_ON_TEAM';

export interface CreateTeamInput {
  tournamentId: string;
  captainId: string;
  name: string;
}

function makeInviteToken(): string {
  return crypto.randomUUID();
}

export async function createTeam(
  db: RosterDb,
  input: CreateTeamInput,
  now: Date = new Date(),
): Promise<ServiceResult<typeof teams.$inferSelect, CreateTeamError>> {
  const [t] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, input.tournamentId))
    .limit(1);
  if (!t) return { ok: false, error: 'TOURNAMENT_NOT_FOUND' };
  if (t.status !== 'OPEN') return { ok: false, error: 'TOURNAMENT_NOT_OPEN' };

  const existing = await db
    .select()
    .from(teams)
    .where(
      and(
        eq(teams.tournamentId, input.tournamentId),
        or(
          eq(teams.captainId, input.captainId),
          eq(teams.partnerId, input.captainId),
        ),
      ),
    );
  if (existing.length > 0) {
    return { ok: false, error: 'ALREADY_ON_TEAM' };
  }

  const [created] = await db
    .insert(teams)
    .values({
      tournamentId: input.tournamentId,
      captainId: input.captainId,
      name: input.name,
      inviteToken: makeInviteToken(),
      inviteExpiresAt: new Date(now.getTime() + INVITE_TOKEN_TTL_MS),
    })
    .returning();
  return { ok: true, value: created };
}

export type DeleteTeamError =
  | 'NOT_FOUND'
  | 'NOT_CAPTAIN'
  | 'TOURNAMENT_STARTED';

export async function deleteTeam(
  db: RosterDb,
  teamId: string,
  actorId: string,
  now: Date = new Date(),
): Promise<ServiceResult<{ id: string }, DeleteTeamError>> {
  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);
  if (!team) return { ok: false, error: 'NOT_FOUND' };
  if (team.captainId !== actorId) return { ok: false, error: 'NOT_CAPTAIN' };

  const [t] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, team.tournamentId))
    .limit(1);
  if (!t) return { ok: false, error: 'NOT_FOUND' };
  if (t.startsAt.getTime() <= now.getTime()) {
    return { ok: false, error: 'TOURNAMENT_STARTED' };
  }

  await db.delete(teams).where(eq(teams.id, teamId));
  return { ok: true, value: { id: teamId } };
}

export type JoinTeamError =
  | 'INVALID_TOKEN'
  | 'EXPIRED'
  | 'TEAM_FULL'
  | 'CANNOT_JOIN_OWN'
  | 'ALREADY_ON_TEAM';

export async function joinTeam(
  db: RosterDb,
  inviteToken: string,
  userId: string,
  now: Date = new Date(),
): Promise<ServiceResult<typeof teams.$inferSelect, JoinTeamError>> {
  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.inviteToken, inviteToken))
    .limit(1);
  if (!team) return { ok: false, error: 'INVALID_TOKEN' };
  if (!team.inviteExpiresAt || team.inviteExpiresAt.getTime() < now.getTime()) {
    return { ok: false, error: 'EXPIRED' };
  }
  if (team.partnerId) return { ok: false, error: 'TEAM_FULL' };
  if (team.captainId === userId) {
    return { ok: false, error: 'CANNOT_JOIN_OWN' };
  }

  const conflict = await db
    .select()
    .from(teams)
    .where(
      and(
        eq(teams.tournamentId, team.tournamentId),
        or(eq(teams.captainId, userId), eq(teams.partnerId, userId)),
      ),
    );
  if (conflict.length > 0) {
    return { ok: false, error: 'ALREADY_ON_TEAM' };
  }

  const [updated] = await db
    .update(teams)
    .set({
      partnerId: userId,
      inviteToken: null,
      inviteExpiresAt: null,
    })
    .where(and(eq(teams.id, team.id), isNull(teams.partnerId)))
    .returning();
  if (!updated) return { ok: false, error: 'TEAM_FULL' };
  return { ok: true, value: updated };
}

export async function getTeamById(db: RosterDb, teamId: string) {
  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);
  return team ?? null;
}

export async function listTeamsByTournament(db: RosterDb, tournamentId: string) {
  return db
    .select()
    .from(teams)
    .where(eq(teams.tournamentId, tournamentId));
}

export async function getTeamsForUser(db: RosterDb, userId: string) {
  return db
    .select({
      id: teams.id,
      name: teams.name,
      tournamentId: teams.tournamentId,
      captainId: teams.captainId,
      partnerId: teams.partnerId,
      inviteToken: teams.inviteToken,
      inviteExpiresAt: teams.inviteExpiresAt,
      tournamentName: tournaments.name,
      tournamentStatus: tournaments.status,
    })
    .from(teams)
    .innerJoin(tournaments, eq(teams.tournamentId, tournaments.id))
    .where(or(eq(teams.captainId, userId), eq(teams.partnerId, userId)));
}

export async function getTeamForUserInTournament(
  db: RosterDb,
  userId: string,
  tournamentId: string,
) {
  const [row] = await db
    .select()
    .from(teams)
    .where(
      and(
        eq(teams.tournamentId, tournamentId),
        or(eq(teams.captainId, userId), eq(teams.partnerId, userId)),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getTeamForMember(
  db: RosterDb,
  teamId: string,
  userId: string,
): Promise<ServiceResult<typeof teams.$inferSelect, 'NOT_FOUND' | 'FORBIDDEN'>> {
  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);
  if (!team) return { ok: false, error: 'NOT_FOUND' };
  if (team.captainId !== userId && team.partnerId !== userId) {
    return { ok: false, error: 'FORBIDDEN' };
  }
  return { ok: true, value: team };
}
