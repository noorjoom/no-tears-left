// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb } from './db-test';
import { users, rosterApplications } from '@/db/schema';

describe('createTestDb (pglite harness)', () => {
  it('inserts and selects a user with auto uuid + default role', async () => {
    const { db, close } = await createTestDb();
    try {
      const [created] = await db
        .insert(users)
        .values({ discordId: '123', discordUsername: 'alice' })
        .returning();
      expect(created.id).toMatch(/^[0-9a-f-]{36}$/i);
      expect(created.role).toBe('MEMBER');

      const found = await db
        .select()
        .from(users)
        .where(eq(users.discordId, '123'));
      expect(found).toHaveLength(1);
    } finally {
      await close();
    }
  });

  it('enforces unique discord_id', async () => {
    const { db, close } = await createTestDb();
    try {
      await db.insert(users).values({ discordId: 'dup', discordUsername: 'a' });
      await expect(
        db.insert(users).values({ discordId: 'dup', discordUsername: 'b' }),
      ).rejects.toThrow();
    } finally {
      await close();
    }
  });

  it('inserts a roster application with FK', async () => {
    const { db, close } = await createTestDb();
    try {
      const [u] = await db
        .insert(users)
        .values({ discordId: 'r1', discordUsername: 'r' })
        .returning();
      await db.insert(rosterApplications).values({
        userId: u.id,
        epicUsername: 'epic',
        platform: 'PC',
        timezone: 'UTC',
        whyText: 'because',
      });
      const apps = await db.select().from(rosterApplications);
      expect(apps).toHaveLength(1);
      expect(apps[0].status).toBe('PENDING');
    } finally {
      await close();
    }
  });
});
