import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import {
  updateSubmission,
  type UpdateSubmissionError,
} from '@/lib/submissions-service';
import { requireRole } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import { MAX_PLACEMENT, MIN_PLACEMENT } from '@/lib/constants';

const idSchema = z.string().uuid();

const patchSchema = z.object({
  matchId: z.string().trim().min(1).max(64).optional(),
  eliminations: z.number().int().min(0).max(100).optional(),
  placement: z.number().int().min(MIN_PLACEMENT).max(MAX_PLACEMENT).optional(),
  screenshotUrl: z.string().url().max(500).nullable().optional(),
});

const ERROR_STATUS: Record<UpdateSubmissionError, number> = {
  NOT_FOUND: 404,
  DUPLICATE_MATCH: 409,
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole('MOD');
  if (!auth.ok) return fail(auth.error, auth.status);

  const { id } = await params;
  if (!idSchema.safeParse(id).success) return fail('Invalid id', 400);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail('Invalid JSON', 400);
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? 'Invalid input', 400);
  }

  const result = await updateSubmission(db, {
    submissionId: id,
    ...parsed.data,
  });
  if (!result.ok) return fail(result.error, ERROR_STATUS[result.error]);
  return ok(result.value);
}
