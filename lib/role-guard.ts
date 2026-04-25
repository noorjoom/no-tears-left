import type { Role } from './constants';

const ROLE_RANK: Record<Role, number> = {
  MEMBER: 1,
  MOD: 2,
  ADMIN: 3,
};

export function hasRole(actual: Role | null | undefined, required: Role): boolean {
  if (!actual) return false;
  return ROLE_RANK[actual] >= ROLE_RANK[required];
}

export function parseAdminDiscordIds(raw: string | undefined): Set<string> {
  if (!raw || raw.trim() === '') return new Set();
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0),
  );
}

export function isAdminDiscordId(discordId: string, raw: string | undefined): boolean {
  return parseAdminDiscordIds(raw).has(discordId);
}
