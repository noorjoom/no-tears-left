import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { joinTeam, type JoinTeamError } from '@/lib/teams-service';
import { requireUser } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import { enforceRateLimit, getRateLimiter } from '@/lib/rate-limit';
import { notifyPartnerJoined } from '@/lib/notifications-triggers';

const bodySchema = z.object({
  inviteToken: z.string().min(1).max(64),
});

const ERROR_STATUS: Record<JoinTeamError, number> = {
  INVALID_TOKEN: 404,
  EXPIRED: 410,
  TEAM_FULL: 409,
  CANNOT_JOIN_OWN: 403,
  ALREADY_ON_TEAM: 409,
};

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return fail(auth.error, auth.status);

  const limited = await enforceRateLimit(getRateLimiter(), 'teams.join', auth.user.id);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail('Invalid JSON', 400);
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? 'Invalid input', 400);
  }

  const result = await joinTeam(db, parsed.data.inviteToken, auth.user.id);
  if (!result.ok) return fail(result.error, ERROR_STATUS[result.error]);
  await notifyPartnerJoined(db, result.value);
  return ok(result.value);
}
