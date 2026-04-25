import { and, desc, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { PgliteDatabase } from 'drizzle-orm/pglite';
import * as schema from '@/db/schema';
import { rosterApplications, users } from '@/db/schema';
import { ROSTER_REAPPLY_COOLDOWN_DAYS, WHY_TEXT_MAX_LENGTH } from './constants';
import type { Platform } from './constants';

export type RosterDb =
  | NodePgDatabase<typeof schema>
  | PgliteDatabase<typeof schema>;

export interface CreateApplicationInput {
  userId: string;
  epicUsername: string;
  platform: Platform;
  timezone: string;
  whyText: string;
  vodUrl?: string | null;
}

export type CreateError =
  | 'WHY_TEXT_TOO_LONG'
  | 'ALREADY_HAS_PENDING'
  | 'ALREADY_APPROVED'
  | 'COOLDOWN_ACTIVE';

export type ServiceResult<T, E = string> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export async function listApprovedRoster(db: RosterDb) {
  return db
    .select({
      id: rosterApplications.id,
      userId: rosterApplications.userId,
      epicUsername: rosterApplications.epicUsername,
      platform: rosterApplications.platform,
      timezone: rosterApplications.timezone,
      discordUsername: users.discordUsername,
      discordAvatar: users.discordAvatar,
    })
    .from(rosterApplications)
    .innerJoin(users, eq(rosterApplications.userId, users.id))
    .where(eq(rosterApplications.status, 'APPROVED'))
    .orderBy(desc(rosterApplications.createdAt));
}

export async function createApplication(
  db: RosterDb,
  input: CreateApplicationInput,
  now: Date = new Date(),
): Promise<ServiceResult<typeof rosterApplications.$inferSelect, CreateError>> {
  if (input.whyText.length > WHY_TEXT_MAX_LENGTH) {
    return { ok: false, error: 'WHY_TEXT_TOO_LONG' };
  }

  const existing = await db
    .select()
    .from(rosterApplications)
    .where(eq(rosterApplications.userId, input.userId))
    .orderBy(desc(rosterApplications.createdAt));

  if (existing.some((a) => a.status === 'APPROVED')) {
    return { ok: false, error: 'ALREADY_APPROVED' };
  }
  if (existing.some((a) => a.status === 'PENDING')) {
    return { ok: false, error: 'ALREADY_HAS_PENDING' };
  }

  const lastReject = existing.find((a) => a.status === 'REJECTED');
  if (lastReject?.reviewedAt) {
    const cooldownMs = ROSTER_REAPPLY_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
    const elapsed = now.getTime() - new Date(lastReject.reviewedAt).getTime();
    if (elapsed < cooldownMs) {
      return { ok: false, error: 'COOLDOWN_ACTIVE' };
    }
  }

  const [created] = await db
    .insert(rosterApplications)
    .values({
      userId: input.userId,
      epicUsername: input.epicUsername,
      platform: input.platform,
      timezone: input.timezone,
      whyText: input.whyText,
      vodUrl: input.vodUrl ?? null,
    })
    .returning();
  return { ok: true, value: created };
}

export type ReviewError =
  | 'NOT_FOUND'
  | 'NOT_PENDING'
  | 'CANNOT_REVIEW_OWN'
  | 'INVALID_DECISION';

export interface ReviewInput {
  applicationId: string;
  reviewerId: string;
  decision: 'APPROVED' | 'REJECTED';
  reviewNote?: string | null;
}

export async function reviewApplication(
  db: RosterDb,
  input: ReviewInput,
  now: Date = new Date(),
): Promise<ServiceResult<typeof rosterApplications.$inferSelect, ReviewError>> {
  if (input.decision !== 'APPROVED' && input.decision !== 'REJECTED') {
    return { ok: false, error: 'INVALID_DECISION' };
  }

  const [app] = await db
    .select()
    .from(rosterApplications)
    .where(eq(rosterApplications.id, input.applicationId))
    .limit(1);

  if (!app) return { ok: false, error: 'NOT_FOUND' };
  if (app.status !== 'PENDING') return { ok: false, error: 'NOT_PENDING' };
  if (app.userId === input.reviewerId) {
    return { ok: false, error: 'CANNOT_REVIEW_OWN' };
  }

  const [updated] = await db
    .update(rosterApplications)
    .set({
      status: input.decision,
      reviewedBy: input.reviewerId,
      reviewNote: input.reviewNote ?? null,
      reviewedAt: now,
    })
    .where(
      and(
        eq(rosterApplications.id, input.applicationId),
        eq(rosterApplications.status, 'PENDING'),
      ),
    )
    .returning();
  return { ok: true, value: updated };
}
