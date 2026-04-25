import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { createTeam, type CreateTeamError } from '@/lib/teams-service';
import { requireUser } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import { enforceRateLimit, getRateLimiter } from '@/lib/rate-limit';

const createSchema = z.object({
  tournamentId: z.string().uuid(),
  name: z.string().trim().min(1).max(64),
});

const ERROR_STATUS: Record<CreateTeamError, number> = {
  TOURNAMENT_NOT_FOUND: 404,
  TOURNAMENT_NOT_OPEN: 409,
  ALREADY_ON_TEAM: 409,
};

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return fail(auth.error, auth.status);

  const limited = await enforceRateLimit(getRateLimiter(), 'teams.create', auth.user.id);
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

  const result = await createTeam(db, {
    tournamentId: parsed.data.tournamentId,
    captainId: auth.user.id,
    name: parsed.data.name,
  });
  if (!result.ok) return fail(result.error, ERROR_STATUS[result.error]);
  return ok(result.value, { status: 201 });
}
