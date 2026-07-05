import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import {
  createVerifiedSubmission,
  listSubmissionsForTeam,
  listSubmissionsWithContext,
  type CreateSubmissionError,
} from '@/lib/submissions-service';
import { getTeamForMember, getTeamById } from '@/lib/teams-service';
import { requireRole, requireUser } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import { enforceRateLimit, getRateLimiter } from '@/lib/rate-limit';
import { hasRole } from '@/lib/role-guard';
import { MAX_PLACEMENT, MIN_PLACEMENT } from '@/lib/constants';
import { notifySubmissionAdded } from '@/lib/notifications-triggers';

const createSchema = z.object({
  teamId: z.string().uuid(),
  matchId: z.string().trim().min(1).max(64),
  eliminations: z.number().int().min(0).max(100),
  placement: z.number().int().min(MIN_PLACEMENT).max(MAX_PLACEMENT),
  screenshotUrl: z.string().url().max(500).optional(),
});

const ERROR_STATUS: Record<CreateSubmissionError, number> = {
  TEAM_NOT_FOUND: 404,
  TOURNAMENT_NOT_FOUND: 404,
  WINDOW_CLOSED: 409,
  DUPLICATE_MATCH: 409,
};

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return fail(auth.error, auth.status);

  const teamId = req.nextUrl.searchParams.get('teamId');

  if (teamId) {
    if (!z.string().uuid().safeParse(teamId).success) {
      return fail('Invalid teamId', 400);
    }
    if (hasRole(auth.user.role, 'MOD')) {
      const team = await getTeamById(db, teamId);
      if (!team) return fail('NOT_FOUND', 404);
    } else {
      const team = await getTeamForMember(db, teamId, auth.user.id);
      if (!team.ok) {
        return fail(team.error, team.error === 'NOT_FOUND' ? 404 : 403);
      }
    }
    const list = await listSubmissionsForTeam(db, teamId);
    return ok(list);
  }

  if (!hasRole(auth.user.role, 'MOD')) return fail('Forbidden', 403);
  const list = await listSubmissionsWithContext(db);
  return ok(list);
}

export async function POST(req: NextRequest) {
  const auth = await requireRole('MOD');
  if (!auth.ok) return fail(auth.error, auth.status);

  const limited = await enforceRateLimit(getRateLimiter(), 'submissions.create', auth.user.id);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail('Invalid JSON', 400);
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? 'Invalid input', 400);
  }

  const result = await createVerifiedSubmission(db, {
    ...parsed.data,
    actorId: auth.user.id,
  });
  if (!result.ok) return fail(result.error, ERROR_STATUS[result.error]);
  await notifySubmissionAdded(db, result.value);
  return ok(result.value, { status: 201 });
}
