import { eq } from 'drizzle-orm';
import { prizePoolConfig } from '@/db/schema';
import type { PrizePoolConfig } from '@/db/schema';
import type { RosterDb } from './roster-service';

export type ServiceResult<T, E = string> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/**
 * Singleton row pattern: there is at most one row in `prize_pool_config`.
 * `getConfig` returns the first row, or null if uninitialized.
 */
export async function getConfig(db: RosterDb): Promise<PrizePoolConfig | null> {
  const [row] = await db.select().from(prizePoolConfig).limit(1);
  return row ?? null;
}

export interface UpdateConfigInput {
  goalAmount?: number;
  currentAmount?: number;
  koFiUrl?: string | null;
  updatedBy: string;
}

export type UpdateConfigError =
  | 'NEGATIVE_AMOUNT'
  | 'INVALID_URL';

function isValidKoFiUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

export async function updateConfig(
  db: RosterDb,
  input: UpdateConfigInput,
  now: Date = new Date(),
): Promise<ServiceResult<PrizePoolConfig, UpdateConfigError>> {
  if (input.goalAmount !== undefined && input.goalAmount < 0) {
    return { ok: false, error: 'NEGATIVE_AMOUNT' };
  }
  if (input.currentAmount !== undefined && input.currentAmount < 0) {
    return { ok: false, error: 'NEGATIVE_AMOUNT' };
  }
  if (
    input.koFiUrl !== undefined &&
    input.koFiUrl !== null &&
    !isValidKoFiUrl(input.koFiUrl)
  ) {
    return { ok: false, error: 'INVALID_URL' };
  }

  const existing = await getConfig(db);
  if (!existing) {
    const [created] = await db
      .insert(prizePoolConfig)
      .values({
        goalAmount: input.goalAmount ?? 0,
        currentAmount: input.currentAmount ?? 0,
        koFiUrl: input.koFiUrl ?? null,
        updatedAt: now,
        updatedBy: input.updatedBy,
      })
      .returning();
    return { ok: true, value: created };
  }

  const [updated] = await db
    .update(prizePoolConfig)
    .set({
      goalAmount: input.goalAmount ?? existing.goalAmount,
      currentAmount: input.currentAmount ?? existing.currentAmount,
      koFiUrl: input.koFiUrl === undefined ? existing.koFiUrl : input.koFiUrl,
      updatedAt: now,
      updatedBy: input.updatedBy,
    })
    .where(eq(prizePoolConfig.id, existing.id))
    .returning();
  return { ok: true, value: updated };
}
