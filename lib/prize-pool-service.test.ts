// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb, type TestDbHandle } from './db-test';
import { users } from '@/db/schema';
import { getConfig, updateConfig } from './prize-pool-service';

async function seedAdmin(h: TestDbHandle): Promise<string> {
  const [u] = await h.db
    .insert(users)
    .values({ discordId: 'a1', discordUsername: 'admin', role: 'ADMIN' })
    .returning();
  return u.id;
}

describe('prize-pool-service', () => {
  let h: TestDbHandle;
  beforeEach(async () => {
    h = await createTestDb();
  });
  afterEach(async () => {
    await h.close();
  });

  it('getConfig returns null when uninitialized', async () => {
    expect(await getConfig(h.db)).toBeNull();
  });

  it('updateConfig creates the singleton on first call', async () => {
    const adminId = await seedAdmin(h);
    const result = await updateConfig(h.db, {
      goalAmount: 500,
      currentAmount: 100,
      koFiUrl: 'https://ko-fi.com/ntl',
      updatedBy: adminId,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.goalAmount).toBe(500);
      expect(result.value.currentAmount).toBe(100);
      expect(result.value.koFiUrl).toBe('https://ko-fi.com/ntl');
      expect(result.value.updatedBy).toBe(adminId);
    }
  });

  it('updateConfig is a singleton — second call updates the same row', async () => {
    const adminId = await seedAdmin(h);
    const a = await updateConfig(h.db, {
      goalAmount: 500,
      updatedBy: adminId,
    });
    const b = await updateConfig(h.db, {
      goalAmount: 1000,
      updatedBy: adminId,
    });
    if (!a.ok || !b.ok) throw new Error('expected ok');
    expect(b.value.id).toBe(a.value.id);
    expect(b.value.goalAmount).toBe(1000);

    const all = await h.db.select().from((await import('@/db/schema')).prizePoolConfig);
    expect(all).toHaveLength(1);
  });

  it('updateConfig partial updates preserve other fields', async () => {
    const adminId = await seedAdmin(h);
    await updateConfig(h.db, {
      goalAmount: 500,
      currentAmount: 100,
      koFiUrl: 'https://ko-fi.com/ntl',
      updatedBy: adminId,
    });
    const result = await updateConfig(h.db, {
      currentAmount: 250,
      updatedBy: adminId,
    });
    if (!result.ok) throw new Error('expected ok');
    expect(result.value.goalAmount).toBe(500);
    expect(result.value.currentAmount).toBe(250);
    expect(result.value.koFiUrl).toBe('https://ko-fi.com/ntl');
  });

  it('updateConfig rejects negative goalAmount', async () => {
    const adminId = await seedAdmin(h);
    const result = await updateConfig(h.db, {
      goalAmount: -1,
      updatedBy: adminId,
    });
    expect(result).toEqual({ ok: false, error: 'NEGATIVE_AMOUNT' });
  });

  it('updateConfig rejects negative currentAmount', async () => {
    const adminId = await seedAdmin(h);
    const result = await updateConfig(h.db, {
      currentAmount: -1,
      updatedBy: adminId,
    });
    expect(result).toEqual({ ok: false, error: 'NEGATIVE_AMOUNT' });
  });

  it('updateConfig rejects malformed koFiUrl', async () => {
    const adminId = await seedAdmin(h);
    const result = await updateConfig(h.db, {
      koFiUrl: 'not a url',
      updatedBy: adminId,
    });
    expect(result).toEqual({ ok: false, error: 'INVALID_URL' });
  });

  it('updateConfig allows clearing koFiUrl by passing null', async () => {
    const adminId = await seedAdmin(h);
    await updateConfig(h.db, {
      koFiUrl: 'https://ko-fi.com/ntl',
      updatedBy: adminId,
    });
    const result = await updateConfig(h.db, {
      koFiUrl: null,
      updatedBy: adminId,
    });
    if (!result.ok) throw new Error('expected ok');
    expect(result.value.koFiUrl).toBeNull();
  });
});
