import { z } from 'zod';
import { db } from '@/db';
import {
  deleteTeam,
  getTeamById,
  getTeamForMember,
  type DeleteTeamError,
} from '@/lib/teams-service';
import { requireUser } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import { hasRole } from '@/lib/role-guard';

const idSchema = z.string().uuid();

const DELETE_ERROR_STATUS: Record<DeleteTeamError, number> = {
  NOT_FOUND: 404,
  NOT_CAPTAIN: 403,
  TOURNAMENT_STARTED: 409,
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return fail(auth.error, auth.status);
  const { id } = await params;
  if (!idSchema.safeParse(id).success) return fail('Invalid id', 400);

  if (hasRole(auth.user.role, 'MOD')) {
    const team = await getTeamById(db, id);
    if (!team) return fail('NOT_FOUND', 404);
    return ok(team);
  }

  const result = await getTeamForMember(db, id, auth.user.id);
  if (!result.ok) {
    return fail(result.error, result.error === 'NOT_FOUND' ? 404 : 403);
  }
  return ok(result.value);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return fail(auth.error, auth.status);
  const { id } = await params;
  if (!idSchema.safeParse(id).success) return fail('Invalid id', 400);

  const result = await deleteTeam(db, id, auth.user.id);
  if (!result.ok) return fail(result.error, DELETE_ERROR_STATUS[result.error]);
  return ok(result.value);
}
