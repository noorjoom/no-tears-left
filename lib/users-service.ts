import { eq, ilike } from 'drizzle-orm';
import { users } from '@/db/schema';
import type { RosterDb } from './roster-service';
import type { ServiceResult } from './tournaments-service';

export type UpdateRoleError =
  | 'NOT_FOUND'
  | 'CANNOT_CHANGE_OWN_ROLE'
  | 'CANNOT_CHANGE_ADMIN'
  | 'INVALID_ROLE_TRANSITION';

export type AllowedRoleTransition = 'MEMBER' | 'MOD';

export interface UpdateUserRoleInput {
  targetUserId: string;
  newRole: AllowedRoleTransition;
  actorId: string;
}

export type UserSearchResult = {
  id: string;
  discordUsername: string;
  role: 'MEMBER' | 'MOD' | 'ADMIN';
};

export async function getUserById(db: RosterDb, id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user ?? null;
}

export async function searchUsers(
  db: RosterDb,
  query: string,
  limit: number,
): Promise<UserSearchResult[]> {
  const escaped = query.replace(/[%_\\]/g, (c) => `\\${c}`);
  return db
    .select({ id: users.id, discordUsername: users.discordUsername, role: users.role })
    .from(users)
    .where(ilike(users.discordUsername, `%${escaped}%`))
    .limit(limit);
}

export async function updateUserRole(
  db: RosterDb,
  input: UpdateUserRoleInput,
): Promise<ServiceResult<typeof users.$inferSelect, UpdateRoleError>> {
  if (input.actorId === input.targetUserId) {
    return { ok: false, error: 'CANNOT_CHANGE_OWN_ROLE' };
  }

  if (input.newRole !== 'MEMBER' && input.newRole !== 'MOD') {
    return { ok: false, error: 'INVALID_ROLE_TRANSITION' };
  }

  const target = await getUserById(db, input.targetUserId);
  if (!target) return { ok: false, error: 'NOT_FOUND' };

  if (target.role === 'ADMIN') {
    return { ok: false, error: 'CANNOT_CHANGE_ADMIN' };
  }

  const [updated] = await db
    .update(users)
    .set({ role: input.newRole })
    .where(eq(users.id, input.targetUserId))
    .returning();
  return { ok: true, value: updated };
}
