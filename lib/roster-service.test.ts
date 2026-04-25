// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb, type TestDbHandle } from './db-test';
import {
  createApplication,
  listApprovedRoster,
  reviewApplication,
} from './roster-service';
import { rosterApplications, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

async function seedUser(
  handle: TestDbHandle,
  discordId: string,
  username: string,
  role: 'MEMBER' | 'MOD' | 'ADMIN' = 'MEMBER',
): Promise<string> {
  const [u] = await handle.db
    .insert(users)
    .values({ discordId, discordUsername: username, role })
    .returning();
  return u.id;
}

describe('roster-service', () => {
  let h: TestDbHandle;
  beforeEach(async () => {
    h = await createTestDb();
  });
  afterEach(async () => {
    await h.close();
  });

  describe('createApplication', () => {
    it('creates a PENDING application', async () => {
      const userId = await seedUser(h, '1', 'alice');
      const result = await createApplication(h.db, {
        userId,
        epicUsername: 'aliceEpic',
        platform: 'PC',
        timezone: 'UTC',
        whyText: 'I want to play',
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe('PENDING');
        expect(result.value.userId).toBe(userId);
      }
    });

    it('rejects when whyText exceeds 500 chars', async () => {
      const userId = await seedUser(h, '1', 'alice');
      const result = await createApplication(h.db, {
        userId,
        epicUsername: 'a',
        platform: 'PC',
        timezone: 'UTC',
        whyText: 'x'.repeat(501),
      });
      expect(result).toEqual({ ok: false, error: 'WHY_TEXT_TOO_LONG' });
    });

    it('rejects when user has a PENDING app', async () => {
      const userId = await seedUser(h, '1', 'alice');
      await createApplication(h.db, {
        userId, epicUsername: 'a', platform: 'PC', timezone: 'UTC', whyText: 'x',
      });
      const result = await createApplication(h.db, {
        userId, epicUsername: 'a', platform: 'PC', timezone: 'UTC', whyText: 'x',
      });
      expect(result).toEqual({ ok: false, error: 'ALREADY_HAS_PENDING' });
    });

    it('rejects when user already approved', async () => {
      const userId = await seedUser(h, '1', 'alice');
      await h.db.insert(rosterApplications).values({
        userId, epicUsername: 'a', platform: 'PC', timezone: 'UTC', whyText: 'x',
        status: 'APPROVED',
      });
      const result = await createApplication(h.db, {
        userId, epicUsername: 'a', platform: 'PC', timezone: 'UTC', whyText: 'x',
      });
      expect(result).toEqual({ ok: false, error: 'ALREADY_APPROVED' });
    });

    it('rejects within 30-day cooldown after rejection', async () => {
      const userId = await seedUser(h, '1', 'alice');
      const rejectedAt = new Date('2026-04-01T00:00:00Z');
      await h.db.insert(rosterApplications).values({
        userId, epicUsername: 'a', platform: 'PC', timezone: 'UTC', whyText: 'x',
        status: 'REJECTED', reviewedAt: rejectedAt,
      });
      const result = await createApplication(
        h.db,
        { userId, epicUsername: 'a', platform: 'PC', timezone: 'UTC', whyText: 'y' },
        new Date('2026-04-15T00:00:00Z'),
      );
      expect(result).toEqual({ ok: false, error: 'COOLDOWN_ACTIVE' });
    });

    it('treats REJECTED with null reviewedAt as cooldown active (fail-safe)', async () => {
      const userId = await seedUser(h, '1', 'alice');
      await h.db.insert(rosterApplications).values({
        userId, epicUsername: 'a', platform: 'PC', timezone: 'UTC', whyText: 'x',
        status: 'REJECTED',
        // reviewedAt left null — data anomaly
      });
      const result = await createApplication(h.db, {
        userId, epicUsername: 'a', platform: 'PC', timezone: 'UTC', whyText: 'y',
      });
      expect(result).toEqual({ ok: false, error: 'COOLDOWN_ACTIVE' });
    });

    it('allows reapply after cooldown', async () => {
      const userId = await seedUser(h, '1', 'alice');
      const rejectedAt = new Date('2026-03-01T00:00:00Z');
      await h.db.insert(rosterApplications).values({
        userId, epicUsername: 'a', platform: 'PC', timezone: 'UTC', whyText: 'x',
        status: 'REJECTED', reviewedAt: rejectedAt,
      });
      const result = await createApplication(
        h.db,
        { userId, epicUsername: 'a', platform: 'PC', timezone: 'UTC', whyText: 'y' },
        new Date('2026-04-15T00:00:00Z'),
      );
      expect(result.ok).toBe(true);
    });
  });

  describe('reviewApplication', () => {
    it('approves a pending application by another user', async () => {
      const applicantId = await seedUser(h, '1', 'alice');
      const modId = await seedUser(h, '2', 'mod', 'MOD');
      const [app] = await h.db.insert(rosterApplications).values({
        userId: applicantId, epicUsername: 'a', platform: 'PC', timezone: 'UTC', whyText: 'x',
      }).returning();
      const result = await reviewApplication(h.db, {
        applicationId: app.id, reviewerId: modId, decision: 'APPROVED',
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe('APPROVED');
        expect(result.value.reviewedBy).toBe(modId);
      }
    });

    it('rejects self-review', async () => {
      const applicantId = await seedUser(h, '1', 'alice', 'MOD');
      const [app] = await h.db.insert(rosterApplications).values({
        userId: applicantId, epicUsername: 'a', platform: 'PC', timezone: 'UTC', whyText: 'x',
      }).returning();
      const result = await reviewApplication(h.db, {
        applicationId: app.id, reviewerId: applicantId, decision: 'APPROVED',
      });
      expect(result).toEqual({ ok: false, error: 'CANNOT_REVIEW_OWN' });
    });

    it('rejects when not pending', async () => {
      const applicantId = await seedUser(h, '1', 'alice');
      const modId = await seedUser(h, '2', 'mod', 'MOD');
      const [app] = await h.db.insert(rosterApplications).values({
        userId: applicantId, epicUsername: 'a', platform: 'PC', timezone: 'UTC', whyText: 'x',
        status: 'APPROVED',
      }).returning();
      const result = await reviewApplication(h.db, {
        applicationId: app.id, reviewerId: modId, decision: 'REJECTED',
      });
      expect(result).toEqual({ ok: false, error: 'NOT_PENDING' });
    });

    it('returns NOT_FOUND for unknown id', async () => {
      const modId = await seedUser(h, '2', 'mod', 'MOD');
      const result = await reviewApplication(h.db, {
        applicationId: '00000000-0000-0000-0000-000000000000',
        reviewerId: modId,
        decision: 'APPROVED',
      });
      expect(result).toEqual({ ok: false, error: 'NOT_FOUND' });
    });
  });

  describe('listApprovedRoster', () => {
    it('returns only APPROVED applications joined with user info', async () => {
      const u1 = await seedUser(h, '1', 'alice');
      const u2 = await seedUser(h, '2', 'bob');
      await h.db.insert(rosterApplications).values({
        userId: u1, epicUsername: 'a', platform: 'PC', timezone: 'UTC', whyText: 'x',
        status: 'APPROVED',
      });
      await h.db.insert(rosterApplications).values({
        userId: u2, epicUsername: 'b', platform: 'CONSOLE', timezone: 'UTC', whyText: 'x',
        status: 'PENDING',
      });
      const list = await listApprovedRoster(h.db);
      expect(list).toHaveLength(1);
      expect(list[0].discordUsername).toBe('alice');
      expect(list[0].epicUsername).toBe('a');
    });
  });
});

// silence unused import
void eq;
