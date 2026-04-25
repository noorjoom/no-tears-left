import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { reviewApplication, type ReviewError } from '@/lib/roster-service';
import { requireRole } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';

const patchSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  reviewNote: z.string().trim().max(500).optional().nullable(),
});

const REVIEW_ERROR_STATUS: Record<ReviewError, number> = {
  NOT_FOUND: 404,
  NOT_PENDING: 409,
  CANNOT_REVIEW_OWN: 403,
  INVALID_DECISION: 400,
};

const idSchema = z.string().uuid();

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole('MOD');
  if (!auth.ok) return fail(auth.error, auth.status);

  const { id } = await params;
  if (!idSchema.safeParse(id).success) {
    return fail('Invalid id', 400);
  }

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

  const result = await reviewApplication(db, {
    applicationId: id,
    reviewerId: auth.user.id,
    decision: parsed.data.decision,
    reviewNote: parsed.data.reviewNote ?? null,
  });
  if (!result.ok) {
    return fail(result.error, REVIEW_ERROR_STATUS[result.error]);
  }
  return ok(result.value);
}
