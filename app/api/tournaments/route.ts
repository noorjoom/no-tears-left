import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import {
  createTournament,
  listTournaments,
  type CreateTournamentError,
} from '@/lib/tournaments-service';
import { requireRole } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(2000).optional().nullable(),
  registrationDeadline: z.string().datetime(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  maxTeams: z.number().int().positive().optional().nullable(),
});

const ERROR_STATUS: Record<CreateTournamentError, number> = {
  INVALID_DATES: 400,
  INVALID_MAX_TEAMS: 400,
};

export async function GET() {
  const list = await listTournaments(db);
  return ok(list);
}

export async function POST(req: NextRequest) {
  const auth = await requireRole('MOD');
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

  const result = await createTournament(db, {
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    registrationDeadline: new Date(parsed.data.registrationDeadline),
    startsAt: new Date(parsed.data.startsAt),
    endsAt: new Date(parsed.data.endsAt),
    maxTeams: parsed.data.maxTeams ?? null,
    createdBy: auth.user.id,
  });
  if (!result.ok) return fail(result.error, ERROR_STATUS[result.error]);
  return ok(result.value, { status: 201 });
}
