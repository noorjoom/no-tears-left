import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import {
  reviewSubmission,
  type ReviewSubmissionError,
} from '@/lib/submissions-service';
import { requireRole } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import { notifySubmissionReviewed } from '@/lib/notifications-triggers';

const idSchema = z.string().uuid();

const patchSchema = z.object({
  decision: z.enum(['VERIFIED', 'REJECTED']),
  reviewNote: z.string().trim().max(500).optional().nullable(),
});

const ERROR_STATUS: Record<ReviewSubmissionError, number> = {
  NOT_FOUND: 404,
  NOT_PENDING: 409,
  CONFLICT_OF_INTEREST: 403,
  INVALID_DECISION: 400,
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

  const result = await reviewSubmission(db, {
    submissionId: id,
    reviewerId: auth.user.id,
    decision: parsed.data.decision,
    reviewNote: parsed.data.reviewNote ?? null,
  });
  if (!result.ok) return fail(result.error, ERROR_STATUS[result.error]);
  await notifySubmissionReviewed(db, result.value);
  return ok(result.value);
}
