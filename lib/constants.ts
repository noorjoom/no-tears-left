export const ROLES = ['MEMBER', 'MOD', 'ADMIN'] as const;
export type Role = (typeof ROLES)[number];

export const PLATFORMS = ['PC', 'CONSOLE'] as const;
export type Platform = (typeof PLATFORMS)[number];

export const PLACEMENT_BONUS_TABLE: ReadonlyArray<{
  min: number;
  max: number;
  points: number;
}> = [
  { min: 1, max: 1, points: 10 },
  { min: 2, max: 3, points: 7 },
  { min: 4, max: 5, points: 5 },
  { min: 6, max: 10, points: 3 },
  { min: 11, max: 25, points: 1 },
  { min: 26, max: 100, points: 0 },
];

export const MIN_PLACEMENT = 1;
export const MAX_PLACEMENT = 100;

export const INVITE_TOKEN_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours
export const ROSTER_REAPPLY_COOLDOWN_DAYS = 30;
export const WHY_TEXT_MAX_LENGTH = 500;
