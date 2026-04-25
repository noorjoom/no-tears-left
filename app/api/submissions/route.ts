import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import {
  createSubmission,
  type CreateSubmissionError,
} from '@/lib/submissions-service';
import { requireUser } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import { MAX_PLACEMENT, MIN_PLACEMENT } from '@/lib/constants';

const createSchema = z.object({
  teamId: z.string().uuid(),
  matchId: z.string().trim().min(1).max(64),
  eliminations: z.number().int().min(0).max(100),
  placement: z.number().int().min(MIN_PLACEMENT).max(MAX_PLACEMENT),
  screenshotUrl: z.string().url().max(500),
});

const ERROR_STATUS: Record<CreateSubmissionError, number> = {
  TEAM_NOT_FOUND: 404,
  NOT_CAPTAIN: 403,
  TOURNAMENT_NOT_FOUND: 404,
  WINDOW_CLOSED: 409,
  DUPLICATE_MATCH: 409,
};

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return fail(auth.error, auth.status);

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

  const result = await createSubmission(db, {
    ...parsed.data,
    actorId: auth.user.id,
  });
  if (!result.ok) return fail(result.error, ERROR_STATUS[result.error]);
  return ok(result.value, { status: 201 });
}
