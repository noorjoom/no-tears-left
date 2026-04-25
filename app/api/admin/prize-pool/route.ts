import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { requireRole } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import {
  getConfig,
  updateConfig,
  type UpdateConfigError,
} from '@/lib/prize-pool-service';

const ERROR_STATUS: Record<UpdateConfigError, number> = {
  NEGATIVE_AMOUNT: 400,
  INVALID_URL: 400,
};

export async function GET() {
  const auth = await requireRole('MOD');
  if (!auth.ok) return fail(auth.error, auth.status);
  const config = await getConfig(db);
  return ok(config);
}

const patchSchema = z
  .object({
    goalAmount: z.number().int().min(0).optional(),
    currentAmount: z.number().int().min(0).optional(),
    koFiUrl: z.string().url().max(500).nullable().optional(),
  })
  .refine(
    (v) =>
      v.goalAmount !== undefined ||
      v.currentAmount !== undefined ||
      v.koFiUrl !== undefined,
    { message: 'At least one field required' },
  );

export async function PATCH(req: NextRequest) {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return fail(auth.error, auth.status);

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

  const result = await updateConfig(db, {
    ...parsed.data,
    updatedBy: auth.user.id,
  });
  if (!result.ok) return fail(result.error, ERROR_STATUS[result.error]);
  return ok(result.value);
}
