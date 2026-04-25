import { auth } from './auth';
import { hasRole } from './role-guard';
import type { Role } from './constants';

export interface AuthedUser {
  id: string;
  role: Role;
  discordId?: string;
}

export type RequireUserResult =
  | { ok: true; user: AuthedUser }
  | { ok: false; status: 401 | 403; error: string };

export async function requireUser(): Promise<RequireUserResult> {
  const session = await auth();
  const user = session?.user;
  if (!user || typeof user.id !== 'string' || typeof user.role !== 'string') {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }
  return {
    ok: true,
    user: { id: user.id, role: user.role as Role },
  };
}

export async function requireRole(required: Role): Promise<RequireUserResult> {
  const result = await requireUser();
  if (!result.ok) return result;
  if (!hasRole(result.user.role, required)) {
    return { ok: false, status: 403, error: 'Forbidden' };
  }
  return result;
}
