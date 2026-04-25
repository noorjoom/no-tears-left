import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import {
  createSubmission,
  listSubmissionsByStatus,
  listSubmissionsForTeam,
  type CreateSubmissionError,
} from '@/lib/submissions-service';
import { getTeamForMember, getTeamById } from '@/lib/teams-service';
import { requireUser } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import { enforceRateLimit, getRateLimiter } from '@/lib/rate-limit';
import { hasRole } from '@/lib/role-guard';
import { MAX_PLACEMENT, MIN_PLACEMENT } from '@/lib/constants';

const createSchema = z.object({
  teamId: z.string().uuid(),
  matchId: z.string().trim().min(1).max(64),
  eliminations: z.number().int().min(0).max(100),
  placement: z.number().int().min(MIN_PLACEMENT).max(MAX_PLACEMENT),
  screenshotUrl: z.string().url().max(500),
});

function expectedScreenshotPrefix(): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET;
  if (!base || !bucket) return null;
  return `${base.replace(/\/$/, '')}/storage/v1/object/public/${bucket}/`;
}

const ERROR_STATUS: Record<CreateSubmissionError, number> = {
  TEAM_NOT_FOUND: 404,
  NOT_CAPTAIN: 403,
  TOURNAMENT_NOT_FOUND: 404,
  WINDOW_CLOSED: 409,
  DUPLICATE_MATCH: 409,
};

const STATUS_VALUES = ['PENDING', 'VERIFIED', 'REJECTED'] as const;

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return fail(auth.error, auth.status);

  const teamId = req.nextUrl.searchParams.get('teamId');
  const status = req.nextUrl.searchParams.get('status');

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

  if (status) {
    if (!hasRole(auth.user.role, 'MOD')) return fail('Forbidden', 403);
    if (!(STATUS_VALUES as readonly string[]).includes(status)) {
      return fail('Invalid status', 400);
    }
    const list = await listSubmissionsByStatus(
      db,
      status as (typeof STATUS_VALUES)[number],
    );
    return ok(list);
  }

  return fail('teamId or status query param required', 400);
}

export async function POST(req: NextRequest) {
  const auth = await requireUser();
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

  const prefix = expectedScreenshotPrefix();
  if (prefix && !parsed.data.screenshotUrl.startsWith(prefix)) {
    return fail('Screenshot URL must point to the configured storage bucket', 400);
  }

  const result = await createSubmission(db, {
    ...parsed.data,
    actorId: auth.user.id,
  });
  if (!result.ok) return fail(result.error, ERROR_STATUS[result.error]);
  return ok(result.value, { status: 201 });
}
