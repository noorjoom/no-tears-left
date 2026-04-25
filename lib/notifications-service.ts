import { and, desc, eq, inArray } from 'drizzle-orm';
import { notifications } from '@/db/schema';
import type { Notification } from '@/db/schema';
import type { RosterDb } from './roster-service';

export type ServiceResult<T, E = string> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export type NotificationType =
  | 'roster_approved'
  | 'roster_rejected'
  | 'submission_verified'
  | 'submission_rejected'
  | 'partner_joined';

const NOTIFICATION_TYPES: ReadonlyArray<NotificationType> = [
  'roster_approved',
  'roster_rejected',
  'submission_verified',
  'submission_rejected',
  'partner_joined',
];

function isNotificationType(t: string): t is NotificationType {
  return (NOTIFICATION_TYPES as readonly string[]).includes(t);
}

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  message: string;
}

export async function createNotification(
  db: RosterDb,
  input: CreateNotificationInput,
): Promise<Notification> {
  if (!isNotificationType(input.type)) {
    throw new Error(`invalid notification type: ${input.type}`);
  }
  const [created] = await db
    .insert(notifications)
    .values({
      userId: input.userId,
      type: input.type,
      message: input.message,
    })
    .returning();
  return created;
}

export interface ListNotificationsOptions {
  unreadOnly?: boolean;
  limit?: number;
}

const DEFAULT_LIST_LIMIT = 50;

export async function listNotificationsForUser(
  db: RosterDb,
  userId: string,
  opts: ListNotificationsOptions = {},
): Promise<Notification[]> {
  const limit = opts.limit ?? DEFAULT_LIST_LIMIT;
  const where = opts.unreadOnly
    ? and(eq(notifications.userId, userId), eq(notifications.read, false))
    : eq(notifications.userId, userId);
  return db
    .select()
    .from(notifications)
    .where(where)
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function countUnreadForUser(
  db: RosterDb,
  userId: string,
): Promise<number> {
  const rows = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(eq(notifications.userId, userId), eq(notifications.read, false)),
    );
  return rows.length;
}

export type MarkReadError = 'INVALID_INPUT';

export interface MarkReadInput {
  userId: string;
  ids?: string[];
  markAll?: boolean;
}

export async function markNotificationsRead(
  db: RosterDb,
  input: MarkReadInput,
): Promise<ServiceResult<{ updated: number }, MarkReadError>> {
  const hasIds = Array.isArray(input.ids) && input.ids.length > 0;
  const wantsAll = input.markAll === true;
  if (hasIds === wantsAll) {
    // Either both supplied or neither — invalid.
    return { ok: false, error: 'INVALID_INPUT' };
  }

  const where = wantsAll
    ? and(
        eq(notifications.userId, input.userId),
        eq(notifications.read, false),
      )
    : and(
        eq(notifications.userId, input.userId),
        inArray(notifications.id, input.ids ?? []),
        eq(notifications.read, false),
      );

  const updated = await db
    .update(notifications)
    .set({ read: true })
    .where(where)
    .returning();

  return { ok: true, value: { updated: updated.length } };
}

// Pure message builders (DB-free; trivially unit-testable).

export function buildRosterApprovedMessage(): string {
  return 'Your roster application was approved. Welcome to NTL.';
}

export function buildRosterRejectedMessage(
  reviewNote: string | null | undefined,
): string {
  const base = 'Your roster application was not approved this time.';
  return reviewNote && reviewNote.trim().length > 0
    ? `${base} Reviewer note: ${reviewNote.trim()}`
    : base;
}

export interface SubmissionVerifiedMessageInput {
  tournamentName: string;
  matchId: string;
  points: number;
}

export function buildSubmissionVerifiedMessage(
  input: SubmissionVerifiedMessageInput,
): string {
  return `Your submission for match ${input.matchId} in ${input.tournamentName} was verified (${input.points} pts).`;
}

export interface SubmissionRejectedMessageInput {
  tournamentName: string;
  matchId: string;
  reviewNote: string | null | undefined;
}

export function buildSubmissionRejectedMessage(
  input: SubmissionRejectedMessageInput,
): string {
  const base = `Your submission for match ${input.matchId} in ${input.tournamentName} was rejected.`;
  return input.reviewNote && input.reviewNote.trim().length > 0
    ? `${base} Reviewer note: ${input.reviewNote.trim()}`
    : base;
}

export interface PartnerJoinedMessageInput {
  teamName: string;
  partnerDiscordUsername: string;
  tournamentName: string;
}

export function buildPartnerJoinedMessage(
  input: PartnerJoinedMessageInput,
): string {
  return `${input.partnerDiscordUsername} joined your team ${input.teamName} for ${input.tournamentName}.`;
}
