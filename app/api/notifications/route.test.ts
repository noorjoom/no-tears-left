// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createTestDb, type TestDbHandle } from '@/lib/db-test';
import { users } from '@/db/schema';
import { createNotification } from '@/lib/notifications-service';

// Stable user id used across tests; must be a valid UUID for auth narrowing.
const ALICE_ID = '00000000-0000-0000-0000-0000000000a1';
const BOB_ID = '00000000-0000-0000-0000-0000000000b2';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(async () => ({
    user: { id: ALICE_ID, role: 'MEMBER' },
  })),
}));

let testHandle: TestDbHandle;

vi.mock('@/db', () => ({
  get db() {
    if (!testHandle) throw new Error('test db not initialized');
    return testHandle.db;
  },
}));

async function jsonReq(
  url: string,
  method: 'GET' | 'PATCH',
  body?: unknown,
): Promise<NextRequest> {
  const init: { method: string; headers?: Record<string, string>; body?: string } = {
    method,
  };
  if (body !== undefined) {
    init.headers = { 'content-type': 'application/json' };
    init.body = JSON.stringify(body);
  }
  return new NextRequest(url, init);
}

describe('GET /api/notifications', () => {
  beforeEach(async () => {
    testHandle = await createTestDb();
    // Seed alice with the fixed UUID so the auth mock matches.
    await testHandle.db.insert(users).values({
      id: ALICE_ID,
      discordId: 'alice-d',
      discordUsername: 'alice',
    });
    await testHandle.db.insert(users).values({
      id: BOB_ID,
      discordId: 'bob-d',
      discordUsername: 'bob',
    });
  });
  afterEach(async () => {
    await testHandle.close();
  });

  it('returns only the caller’s notifications', async () => {
    await createNotification(testHandle.db, {
      userId: ALICE_ID,
      type: 'roster_approved',
      message: 'mine',
    });
    await createNotification(testHandle.db, {
      userId: BOB_ID,
      type: 'roster_approved',
      message: 'not mine',
    });

    const { GET } = await import('@/app/api/notifications/route');
    const req = await jsonReq('http://localhost/api/notifications', 'GET');
    const res = await GET(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0].message).toBe('mine');
    expect(body.data.unreadCount).toBe(1);
  });

  it('?unread=1 filters to unread only', async () => {
    const n1 = await createNotification(testHandle.db, {
      userId: ALICE_ID,
      type: 'roster_approved',
      message: 'a',
    });
    await createNotification(testHandle.db, {
      userId: ALICE_ID,
      type: 'partner_joined',
      message: 'b',
    });
    const { markNotificationsRead } = await import(
      '@/lib/notifications-service'
    );
    await markNotificationsRead(testHandle.db, {
      userId: ALICE_ID,
      ids: [n1.id],
    });

    const { GET } = await import('@/app/api/notifications/route');
    const req = await jsonReq('http://localhost/api/notifications?unread=1', 'GET');
    const res = await GET(req);
    const body = await res.json();
    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0].message).toBe('b');
  });
});

describe('PATCH /api/notifications', () => {
  beforeEach(async () => {
    testHandle = await createTestDb();
    await testHandle.db.insert(users).values({
      id: ALICE_ID,
      discordId: 'alice-d',
      discordUsername: 'alice',
    });
    await testHandle.db.insert(users).values({
      id: BOB_ID,
      discordId: 'bob-d',
      discordUsername: 'bob',
    });
  });
  afterEach(async () => {
    await testHandle.close();
  });

  it('marks own notifications read', async () => {
    const n = await createNotification(testHandle.db, {
      userId: ALICE_ID,
      type: 'roster_approved',
      message: 'a',
    });
    const { PATCH } = await import('@/app/api/notifications/route');
    const req = await jsonReq('http://localhost/api/notifications', 'PATCH', {
      ids: [n.id],
    });
    const res = await PATCH(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.updated).toBe(1);
  });

  it('cannot mark another user’s notification read', async () => {
    const bobs = await createNotification(testHandle.db, {
      userId: BOB_ID,
      type: 'roster_approved',
      message: "bob's",
    });
    const { PATCH } = await import('@/app/api/notifications/route');
    const req = await jsonReq('http://localhost/api/notifications', 'PATCH', {
      ids: [bobs.id],
    });
    const res = await PATCH(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.updated).toBe(0);

    // Confirm bob's row is still unread
    const { listNotificationsForUser } = await import(
      '@/lib/notifications-service'
    );
    const bobsNotes = await listNotificationsForUser(testHandle.db, BOB_ID);
    expect(bobsNotes[0].read).toBe(false);
  });

  it('rejects malformed body', async () => {
    const { PATCH } = await import('@/app/api/notifications/route');
    const req = await jsonReq('http://localhost/api/notifications', 'PATCH', {
      something: 'wrong',
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it('markAll: true marks all caller unread', async () => {
    await createNotification(testHandle.db, {
      userId: ALICE_ID,
      type: 'roster_approved',
      message: 'a',
    });
    await createNotification(testHandle.db, {
      userId: ALICE_ID,
      type: 'partner_joined',
      message: 'b',
    });
    const { PATCH } = await import('@/app/api/notifications/route');
    const req = await jsonReq('http://localhost/api/notifications', 'PATCH', {
      markAll: true,
    });
    const res = await PATCH(req);
    const body = await res.json();
    expect(body.data.updated).toBe(2);
  });
});

describe('GET /api/notifications unauthenticated', () => {
  beforeEach(async () => {
    testHandle = await createTestDb();
  });
  afterEach(async () => {
    await testHandle.close();
  });

  it('returns 401 when no session', async () => {
    const authMod = await import('@/lib/auth');
    vi.mocked(authMod.auth).mockResolvedValueOnce(null as never);

    const { GET } = await import('@/app/api/notifications/route');
    const req = await jsonReq('http://localhost/api/notifications', 'GET');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});
