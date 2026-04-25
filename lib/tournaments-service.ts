import { desc, eq, ne } from 'drizzle-orm';
import { tournaments } from '@/db/schema';
import type { RosterDb } from './roster-service';

export type ServiceResult<T, E = string> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export type TournamentStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'CLOSED'
  | 'ARCHIVED';

export interface CreateTournamentInput {
  name: string;
  description?: string | null;
  registrationDeadline: Date;
  startsAt: Date;
  endsAt: Date;
  maxTeams?: number | null;
  createdBy: string;
}

export type CreateTournamentError =
  | 'INVALID_DATES'
  | 'INVALID_MAX_TEAMS';

export async function listTournaments(
  db: RosterDb,
  opts: { includeDrafts?: boolean } = {},
) {
  const query = db.select().from(tournaments);
  const filtered = opts.includeDrafts
    ? query
    : query.where(ne(tournaments.status, 'DRAFT'));
  return filtered.orderBy(desc(tournaments.startsAt));
}

export async function getTournament(
  db: RosterDb,
  id: string,
  opts: { includeDrafts?: boolean } = {},
) {
  const [t] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, id))
    .limit(1);
  if (!t) return null;
  if (!opts.includeDrafts && t.status === 'DRAFT') return null;
  return t;
}

export async function createTournament(
  db: RosterDb,
  input: CreateTournamentInput,
): Promise<ServiceResult<typeof tournaments.$inferSelect, CreateTournamentError>> {
  if (
    input.registrationDeadline.getTime() > input.startsAt.getTime() ||
    input.startsAt.getTime() >= input.endsAt.getTime()
  ) {
    return { ok: false, error: 'INVALID_DATES' };
  }
  if (input.maxTeams != null && input.maxTeams < 1) {
    return { ok: false, error: 'INVALID_MAX_TEAMS' };
  }
  const [created] = await db
    .insert(tournaments)
    .values({
      name: input.name,
      description: input.description ?? null,
      registrationDeadline: input.registrationDeadline,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      maxTeams: input.maxTeams ?? null,
      createdBy: input.createdBy,
    })
    .returning();
  return { ok: true, value: created };
}

export interface UpdateTournamentInput {
  name?: string;
  description?: string | null;
  registrationDeadline?: Date;
  startsAt?: Date;
  endsAt?: Date;
  maxTeams?: number | null;
  status?: TournamentStatus;
}

export type UpdateTournamentError = 'NOT_FOUND' | 'INVALID_DATES' | 'INVALID_MAX_TEAMS';

export async function updateTournament(
  db: RosterDb,
  id: string,
  input: UpdateTournamentInput,
): Promise<ServiceResult<typeof tournaments.$inferSelect, UpdateTournamentError>> {
  const existing = await getTournament(db, id, { includeDrafts: true });
  if (!existing) return { ok: false, error: 'NOT_FOUND' };

  const next = {
    registrationDeadline: input.registrationDeadline ?? existing.registrationDeadline,
    startsAt: input.startsAt ?? existing.startsAt,
    endsAt: input.endsAt ?? existing.endsAt,
  };
  if (
    next.registrationDeadline.getTime() > next.startsAt.getTime() ||
    next.startsAt.getTime() >= next.endsAt.getTime()
  ) {
    return { ok: false, error: 'INVALID_DATES' };
  }
  if (input.maxTeams != null && input.maxTeams < 1) {
    return { ok: false, error: 'INVALID_MAX_TEAMS' };
  }

  const [updated] = await db
    .update(tournaments)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.registrationDeadline ? { registrationDeadline: input.registrationDeadline } : {}),
      ...(input.startsAt ? { startsAt: input.startsAt } : {}),
      ...(input.endsAt ? { endsAt: input.endsAt } : {}),
      ...(input.maxTeams !== undefined ? { maxTeams: input.maxTeams } : {}),
      ...(input.status ? { status: input.status } : {}),
    })
    .where(eq(tournaments.id, id))
    .returning();
  return { ok: true, value: updated };
}
