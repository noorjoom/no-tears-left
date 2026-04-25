// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb, type TestDbHandle } from './db-test';
import { users } from '@/db/schema';
import {
  buildPartnerJoinedMessage,
  buildRosterApprovedMessage,
  buildRosterRejectedMessage,
  buildSubmissionRejectedMessage,
  buildSubmissionVerifiedMessage,
  countUnreadForUser,
  createNotification,
  listNotificationsForUser,
  markNotificationsRead,
} from './notifications-service';

async function seedUser(
  handle: TestDbHandle,
  discordId: string,
  username: string,
): Promise<string> {
  const [u] = await handle.db
    .insert(users)
    .values({ discordId, discordUsername: username })
    .returning();
  return u.id;
}

describe('notifications-service: message builders', () => {
  it('buildRosterApprovedMessage returns expected text', () => {
    expect(buildRosterApprovedMessage()).toMatch(/approved/i);
  });

  it('buildRosterRejectedMessage handles null and present note', () => {
    expect(buildRosterRejectedMessage(null)).toMatch(/not approved/i);
    expect(buildRosterRejectedMessage('be more specific')).toMatch(
      /be more specific/,
    );
  });

  it('buildSubmissionVerifiedMessage includes points and match', () => {
    const msg = buildSubmissionVerifiedMessage({
      tournamentName: 'Cup',
      matchId: 'm-1',
      points: 17,
    });
    expect(msg).toContain('17');
    expect(msg).toContain('m-1');
    expect(msg).toContain('Cup');
  });

  it('buildSubmissionRejectedMessage handles null and present note', () => {
    expect(
      buildSubmissionRejectedMessage({
        tournamentName: 'Cup',
        matchId: 'm-1',
        reviewNote: null,
      }),
    ).not.toMatch(/Reviewer note/);
    expect(
      buildSubmissionRejectedMessage({
        tournamentName: 'Cup',
        matchId: 'm-1',
        reviewNote: 'blurry screenshot',
      }),
    ).toMatch(/blurry screenshot/);
  });

  it('buildPartnerJoinedMessage interpolates inputs', () => {
    const msg = buildPartnerJoinedMessage({
      teamName: 'Cool Team',
      partnerDiscordUsername: 'bob',
      tournamentName: 'Cup',
    });
    expect(msg).toContain('bob');
    expect(msg).toContain('Cool Team');
    expect(msg).toContain('Cup');
  });
});

describe('notifications-service: db ops', () => {
  let h: TestDbHandle;
  beforeEach(async () => {
    h = await createTestDb();
  });
  afterEach(async () => {
    await h.close();
  });

  it('createNotification inserts row with read=false default', async () => {
    const userId = await seedUser(h, '1', 'alice');
    const n = await createNotification(h.db, {
      userId,
      type: 'roster_approved',
      message: 'hi',
    });
    expect(n.read).toBe(false);
    expect(n.userId).toBe(userId);
    expect(n.type).toBe('roster_approved');
  });

  it('createNotification rejects unknown type', async () => {
    const userId = await seedUser(h, '1', 'alice');
    await expect(
      createNotification(h.db, {
        userId,
        // @ts-expect-error invalid type for test
        type: 'bogus',
        message: 'x',
      }),
    ).rejects.toThrow(/invalid notification type/i);
  });

  it('listNotificationsForUser orders newest first and respects limit', async () => {
    const userId = await seedUser(h, '1', 'alice');
    await createNotification(h.db, { userId, type: 'roster_approved', message: 'a' });
    await new Promise((r) => setTimeout(r, 5));
    await createNotification(h.db, { userId, type: 'partner_joined', message: 'b' });
    await new Promise((r) => setTimeout(r, 5));
    await createNotification(h.db, { userId, type: 'submission_verified', message: 'c' });

    const all = await listNotificationsForUser(h.db, userId);
    expect(all).toHaveLength(3);
    expect(all[0].message).toBe('c');
    expect(all[2].message).toBe('a');

    const limited = await listNotificationsForUser(h.db, userId, { limit: 2 });
    expect(limited).toHaveLength(2);
  });

  it('listNotificationsForUser unreadOnly filters', async () => {
    const userId = await seedUser(h, '1', 'alice');
    const n1 = await createNotification(h.db, {
      userId,
      type: 'roster_approved',
      message: 'a',
    });
    await createNotification(h.db, {
      userId,
      type: 'partner_joined',
      message: 'b',
    });
    await markNotificationsRead(h.db, { userId, ids: [n1.id] });

    const unread = await listNotificationsForUser(h.db, userId, {
      unreadOnly: true,
    });
    expect(unread).toHaveLength(1);
    expect(unread[0].message).toBe('b');
  });

  it('listNotificationsForUser returns empty for unknown user', async () => {
    const list = await listNotificationsForUser(
      h.db,
      '00000000-0000-0000-0000-000000000000',
    );
    expect(list).toEqual([]);
  });

  it('markNotificationsRead with ids flips read flag', async () => {
    const userId = await seedUser(h, '1', 'alice');
    const n = await createNotification(h.db, {
      userId,
      type: 'roster_approved',
      message: 'a',
    });
    const result = await markNotificationsRead(h.db, {
      userId,
      ids: [n.id],
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.updated).toBe(1);

    const after = await listNotificationsForUser(h.db, userId);
    expect(after[0].read).toBe(true);
  });

  it('markNotificationsRead with markAll flips all unread', async () => {
    const userId = await seedUser(h, '1', 'alice');
    await createNotification(h.db, { userId, type: 'roster_approved', message: 'a' });
    await createNotification(h.db, { userId, type: 'partner_joined', message: 'b' });
    const result = await markNotificationsRead(h.db, {
      userId,
      markAll: true,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.updated).toBe(2);

    const unread = await listNotificationsForUser(h.db, userId, {
      unreadOnly: true,
    });
    expect(unread).toHaveLength(0);
  });

  it('markNotificationsRead does NOT touch other users notifications (cross-user safety)', async () => {
    const aliceId = await seedUser(h, '1', 'alice');
    const bobId = await seedUser(h, '2', 'bob');
    const bobsNote = await createNotification(h.db, {
      userId: bobId,
      type: 'roster_approved',
      message: "bob's",
    });
    // Alice attempts to mark Bob's notification read.
    const result = await markNotificationsRead(h.db, {
      userId: aliceId,
      ids: [bobsNote.id],
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.updated).toBe(0);

    const bobsNotes = await listNotificationsForUser(h.db, bobId);
    expect(bobsNotes[0].read).toBe(false); // unchanged
  });

  it('markNotificationsRead with empty ids returns INVALID_INPUT', async () => {
    const userId = await seedUser(h, '1', 'alice');
    const result = await markNotificationsRead(h.db, { userId, ids: [] });
    expect(result).toEqual({ ok: false, error: 'INVALID_INPUT' });
  });

  it('markNotificationsRead with both ids and markAll returns INVALID_INPUT', async () => {
    const userId = await seedUser(h, '1', 'alice');
    const n = await createNotification(h.db, {
      userId,
      type: 'roster_approved',
      message: 'a',
    });
    const result = await markNotificationsRead(h.db, {
      userId,
      ids: [n.id],
      markAll: true,
    });
    expect(result).toEqual({ ok: false, error: 'INVALID_INPUT' });
  });

  it('markNotificationsRead with neither returns INVALID_INPUT', async () => {
    const userId = await seedUser(h, '1', 'alice');
    const result = await markNotificationsRead(h.db, { userId });
    expect(result).toEqual({ ok: false, error: 'INVALID_INPUT' });
  });

  it('countUnreadForUser ignores read rows', async () => {
    const userId = await seedUser(h, '1', 'alice');
    const a = await createNotification(h.db, {
      userId,
      type: 'roster_approved',
      message: 'a',
    });
    await createNotification(h.db, { userId, type: 'partner_joined', message: 'b' });
    expect(await countUnreadForUser(h.db, userId)).toBe(2);

    await markNotificationsRead(h.db, { userId, ids: [a.id] });
    expect(await countUnreadForUser(h.db, userId)).toBe(1);
  });
});
