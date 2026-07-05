import { desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { submissions, teams, tournaments, users } from '@/db/schema';
import type { RosterDb } from './roster-service';

export type ServiceResult<T, E = string> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export type CreateSubmissionError =
  | 'TEAM_NOT_FOUND'
  | 'TOURNAMENT_NOT_FOUND'
  | 'WINDOW_CLOSED'
  | 'DUPLICATE_MATCH';

export interface CreateSubmissionInput {
  teamId: string;
  matchId: string;
  eliminations: number;
  placement: number;
  screenshotUrl?: string | null;
  actorId: string;
}

export async function createVerifiedSubmission(
  db: RosterDb,
  input: CreateSubmissionInput,
  now: Date = new Date(),
): Promise<ServiceResult<typeof submissions.$inferSelect, CreateSubmissionError>> {
  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.id, input.teamId))
    .limit(1);
  if (!team) return { ok: false, error: 'TEAM_NOT_FOUND' };

  const [tourney] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, team.tournamentId))
    .limit(1);
  if (!tourney) return { ok: false, error: 'TOURNAMENT_NOT_FOUND' };
  if (
    tourney.startsAt.getTime() > now.getTime() ||
    tourney.endsAt.getTime() < now.getTime()
  ) {
    return { ok: false, error: 'WINDOW_CLOSED' };
  }

  try {
    const [created] = await db
      .insert(submissions)
      .values({
        teamId: input.teamId,
        tournamentId: team.tournamentId,
        matchId: input.matchId,
        eliminations: input.eliminations,
        placement: input.placement,
        screenshotUrl: input.screenshotUrl ?? null,
        status: 'VERIFIED',
        reviewedBy: input.actorId,
        reviewedAt: now,
      })
      .returning();
    return { ok: true, value: created };
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { ok: false, error: 'DUPLICATE_MATCH' };
    }
    throw err;
  }
}

function isUniqueViolation(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const e = err as { code?: string; message?: string };
  return (
    e.code === '23505' ||
    (typeof e.message === 'string' && e.message.includes('unique_match_team'))
  );
}

export type UpdateSubmissionError = 'NOT_FOUND' | 'DUPLICATE_MATCH';

export interface UpdateSubmissionInput {
  submissionId: string;
  matchId?: string;
  eliminations?: number;
  placement?: number;
  screenshotUrl?: string | null;
}

export async function updateSubmission(
  db: RosterDb,
  input: UpdateSubmissionInput,
): Promise<ServiceResult<typeof submissions.$inferSelect, UpdateSubmissionError>> {
  const [existing] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, input.submissionId))
    .limit(1);
  if (!existing) return { ok: false, error: 'NOT_FOUND' };

  try {
    const [updated] = await db
      .update(submissions)
      .set({
        ...(input.matchId !== undefined ? { matchId: input.matchId } : {}),
        ...(input.eliminations !== undefined
          ? { eliminations: input.eliminations }
          : {}),
        ...(input.placement !== undefined ? { placement: input.placement } : {}),
        ...(input.screenshotUrl !== undefined
          ? { screenshotUrl: input.screenshotUrl }
          : {}),
      })
      .where(eq(submissions.id, input.submissionId))
      .returning();
    return { ok: true, value: updated };
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { ok: false, error: 'DUPLICATE_MATCH' };
    }
    throw err;
  }
}

export async function listSubmissionsForTeam(db: RosterDb, teamId: string) {
  return db
    .select()
    .from(submissions)
    .where(eq(submissions.teamId, teamId))
    .orderBy(desc(submissions.submittedAt));
}

const reviewerUsers = alias(users, 'reviewer');

export async function listSubmissionsWithContext(db: RosterDb, limit = 50) {
  return db
    .select({
      id: submissions.id,
      teamId: submissions.teamId,
      teamName: teams.name,
      tournamentId: submissions.tournamentId,
      tournamentName: tournaments.name,
      matchId: submissions.matchId,
      eliminations: submissions.eliminations,
      placement: submissions.placement,
      screenshotUrl: submissions.screenshotUrl,
      reviewNote: submissions.reviewNote,
      reviewedAt: submissions.reviewedAt,
      submittedAt: submissions.submittedAt,
      reviewerUsername: reviewerUsers.discordUsername,
    })
    .from(submissions)
    .innerJoin(teams, eq(submissions.teamId, teams.id))
    .innerJoin(tournaments, eq(submissions.tournamentId, tournaments.id))
    .leftJoin(reviewerUsers, eq(submissions.reviewedBy, reviewerUsers.id))
    .orderBy(desc(submissions.submittedAt))
    .limit(limit);
}
