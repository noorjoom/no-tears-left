import { and, desc, eq } from 'drizzle-orm';
import { submissions, teams, tournaments } from '@/db/schema';
import type { RosterDb } from './roster-service';

export type ServiceResult<T, E = string> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export type CreateSubmissionError =
  | 'TEAM_NOT_FOUND'
  | 'NOT_CAPTAIN'
  | 'TOURNAMENT_NOT_FOUND'
  | 'WINDOW_CLOSED'
  | 'DUPLICATE_MATCH';

export interface CreateSubmissionInput {
  teamId: string;
  matchId: string;
  eliminations: number;
  placement: number;
  screenshotUrl: string;
  actorId: string;
}

export async function createSubmission(
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
  if (team.captainId !== input.actorId) {
    return { ok: false, error: 'NOT_CAPTAIN' };
  }

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
        screenshotUrl: input.screenshotUrl,
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

export type ReviewSubmissionError =
  | 'NOT_FOUND'
  | 'NOT_PENDING'
  | 'CONFLICT_OF_INTEREST'
  | 'INVALID_DECISION';

export interface ReviewSubmissionInput {
  submissionId: string;
  reviewerId: string;
  decision: 'VERIFIED' | 'REJECTED';
  reviewNote?: string | null;
}

export async function reviewSubmission(
  db: RosterDb,
  input: ReviewSubmissionInput,
  now: Date = new Date(),
): Promise<ServiceResult<typeof submissions.$inferSelect, ReviewSubmissionError>> {
  if (input.decision !== 'VERIFIED' && input.decision !== 'REJECTED') {
    return { ok: false, error: 'INVALID_DECISION' };
  }

  const [sub] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, input.submissionId))
    .limit(1);
  if (!sub) return { ok: false, error: 'NOT_FOUND' };
  if (sub.status !== 'PENDING') return { ok: false, error: 'NOT_PENDING' };

  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.id, sub.teamId))
    .limit(1);
  if (!team) return { ok: false, error: 'NOT_FOUND' };
  if (team.captainId === input.reviewerId || team.partnerId === input.reviewerId) {
    return { ok: false, error: 'CONFLICT_OF_INTEREST' };
  }

  const [updated] = await db
    .update(submissions)
    .set({
      status: input.decision,
      reviewedBy: input.reviewerId,
      reviewNote: input.reviewNote ?? null,
      reviewedAt: now,
    })
    .where(
      and(
        eq(submissions.id, input.submissionId),
        eq(submissions.status, 'PENDING'),
      ),
    )
    .returning();
  if (!updated) return { ok: false, error: 'NOT_PENDING' };
  return { ok: true, value: updated };
}

export async function listSubmissionsForTeam(db: RosterDb, teamId: string) {
  return db
    .select()
    .from(submissions)
    .where(eq(submissions.teamId, teamId))
    .orderBy(desc(submissions.submittedAt));
}

export async function listSubmissionsByStatus(
  db: RosterDb,
  status: 'PENDING' | 'VERIFIED' | 'REJECTED',
) {
  return db
    .select()
    .from(submissions)
    .where(eq(submissions.status, status))
    .orderBy(desc(submissions.submittedAt));
}

export async function listSubmissionsByStatusWithContext(
  db: RosterDb,
  status: 'PENDING' | 'VERIFIED' | 'REJECTED',
) {
  return db
    .select({
      id: submissions.id,
      teamId: submissions.teamId,
      teamName: teams.name,
      captainId: teams.captainId,
      partnerId: teams.partnerId,
      tournamentId: submissions.tournamentId,
      tournamentName: tournaments.name,
      matchId: submissions.matchId,
      eliminations: submissions.eliminations,
      placement: submissions.placement,
      screenshotUrl: submissions.screenshotUrl,
      status: submissions.status,
      submittedAt: submissions.submittedAt,
      reviewNote: submissions.reviewNote,
    })
    .from(submissions)
    .innerJoin(teams, eq(submissions.teamId, teams.id))
    .innerJoin(tournaments, eq(submissions.tournamentId, tournaments.id))
    .where(eq(submissions.status, status))
    .orderBy(desc(submissions.submittedAt));
}
