import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { requireRole } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import { getRateLimiter, enforceRateLimit } from '@/lib/rate-limit';
import { updateUserRole, type UpdateRoleError } from '@/lib/users-service';

const ERROR_STATUS: Record<UpdateRoleError, number> = {
  NOT_FOUND: 404,
  CANNOT_CHANGE_OWN_ROLE: 403,
  CANNOT_CHANGE_ADMIN: 403,
  INVALID_ROLE_TRANSITION: 400,
};

const patchSchema = z.object({
  targetUserId: z.string().uuid(),
  newRole: z.enum(['MEMBER', 'MOD']),
});

export async function PATCH(req: NextRequest) {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return fail(auth.error, auth.status);

  const rateLimited = await enforceRateLimit(getRateLimiter(), 'admin.roles', auth.user.id);
  if (rateLimited) return rateLimited;

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

  const result = await updateUserRole(db, {
    targetUserId: parsed.data.targetUserId,
    newRole: parsed.data.newRole,
    actorId: auth.user.id,
  });
  if (!result.ok) return fail(result.error, ERROR_STATUS[result.error]);
  return ok({ id: result.value.id, discordUsername: result.value.discordUsername, role: result.value.role });
}
