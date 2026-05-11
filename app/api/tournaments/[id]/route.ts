import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import {
  getTournament,
  updateTournament,
  type UpdateTournamentError,
} from '@/lib/tournaments-service';
import { requireRole, requireUser } from '@/lib/api-auth';
import { hasRole } from '@/lib/role-guard';
import { fail, ok } from '@/lib/api-response';
import { getRateLimiter, enforceRateLimit } from '@/lib/rate-limit';

const idSchema = z.string().uuid();

const patchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().max(2000).optional().nullable(),
  registrationDeadline: z.string().datetime().optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  maxTeams: z.number().int().positive().optional().nullable(),
  status: z.enum(['DRAFT', 'OPEN', 'IN_PROGRESS', 'CLOSED', 'ARCHIVED']).optional(),
});

const ERROR_STATUS: Record<UpdateTournamentError, number> = {
  NOT_FOUND: 404,
  INVALID_DATES: 400,
  INVALID_MAX_TEAMS: 400,
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) return fail('Invalid id', 400);
  const session = await requireUser();
  const includeDrafts = session.ok && hasRole(session.user.role, 'MOD');
  const t = await getTournament(db, id, { includeDrafts });
  if (!t) return fail('Not found', 404);
  return ok(t);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole('MOD');
  if (!auth.ok) return fail(auth.error, auth.status);

  const rateLimited = await enforceRateLimit(getRateLimiter(), 'admin.tournaments.write', auth.user.id);
  if (rateLimited) return rateLimited;

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

  const result = await updateTournament(db, id, {
    name: parsed.data.name,
    description: parsed.data.description ?? undefined,
    registrationDeadline: parsed.data.registrationDeadline
      ? new Date(parsed.data.registrationDeadline)
      : undefined,
    startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : undefined,
    endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : undefined,
    maxTeams: parsed.data.maxTeams,
    status: parsed.data.status,
  });
  if (!result.ok) return fail(result.error, ERROR_STATUS[result.error]);
  return ok(result.value);
}
