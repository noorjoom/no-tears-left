// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb, type TestDbHandle } from './db-test';
import {
  getUserById,
  searchUsers,
  updateUserRole,
} from './users-service';
import { users } from '@/db/schema';

async function seedUser(
  h: TestDbHandle,
  overrides: { discordId: string; discordUsername: string; role?: 'MEMBER' | 'MOD' | 'ADMIN' },
) {
  const [u] = await h.db
    .insert(users)
    .values({ discordId: overrides.discordId, discordUsername: overrides.discordUsername, role: overrides.role ?? 'MEMBER' })
    .returning();
  return u;
}

describe('users-service', () => {
  let h: TestDbHandle;
  beforeEach(async () => { h = await createTestDb(); });
  afterEach(async () => { await h.close(); });

  describe('getUserById', () => {
    it('returns user when found', async () => {
      const u = await seedUser(h, { discordId: 'd1', discordUsername: 'alice' });
      const found = await getUserById(h.db, u.id);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(u.id);
    });

    it('returns null when not found', async () => {
      const result = await getUserById(h.db, '00000000-0000-0000-0000-000000000000');
      expect(result).toBeNull();
    });
  });

  describe('searchUsers', () => {
    it('finds users by partial discord username', async () => {
      await seedUser(h, { discordId: 'd1', discordUsername: 'alice123' });
      await seedUser(h, { discordId: 'd2', discordUsername: 'bob456' });
      const results = await searchUsers(h.db, 'alice', 10);
      expect(results).toHaveLength(1);
      expect(results[0].discordUsername).toBe('alice123');
    });

    it('is case-insensitive', async () => {
      await seedUser(h, { discordId: 'd1', discordUsername: 'Alice' });
      const results = await searchUsers(h.db, 'alice', 10);
      expect(results).toHaveLength(1);
    });

    it('respects limit', async () => {
      await seedUser(h, { discordId: 'd1', discordUsername: 'user1' });
      await seedUser(h, { discordId: 'd2', discordUsername: 'user2' });
      await seedUser(h, { discordId: 'd3', discordUsername: 'user3' });
      const results = await searchUsers(h.db, 'user', 2);
      expect(results).toHaveLength(2);
    });

    it('returns only id, discordUsername, role fields', async () => {
      await seedUser(h, { discordId: 'd1', discordUsername: 'alice' });
      const results = await searchUsers(h.db, 'alice', 10);
      expect(Object.keys(results[0]).sort()).toEqual(['discordUsername', 'id', 'role'].sort());
    });

    it('escapes LIKE metacharacters — % does not match all users', async () => {
      await seedUser(h, { discordId: 'd1', discordUsername: 'alice' });
      await seedUser(h, { discordId: 'd2', discordUsername: 'bob' });
      const results = await searchUsers(h.db, '%', 10);
      expect(results).toHaveLength(0);
    });
  });

  describe('updateUserRole', () => {
    it('promotes MEMBER to MOD', async () => {
      const actor = await seedUser(h, { discordId: 'a1', discordUsername: 'admin', role: 'ADMIN' });
      const target = await seedUser(h, { discordId: 't1', discordUsername: 'member' });
      const result = await updateUserRole(h.db, { targetUserId: target.id, newRole: 'MOD', actorId: actor.id });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.role).toBe('MOD');
    });

    it('demotes MOD to MEMBER', async () => {
      const actor = await seedUser(h, { discordId: 'a1', discordUsername: 'admin', role: 'ADMIN' });
      const target = await seedUser(h, { discordId: 't1', discordUsername: 'moduser', role: 'MOD' });
      const result = await updateUserRole(h.db, { targetUserId: target.id, newRole: 'MEMBER', actorId: actor.id });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.role).toBe('MEMBER');
    });

    it('returns NOT_FOUND for unknown targetUserId', async () => {
      const actor = await seedUser(h, { discordId: 'a1', discordUsername: 'admin', role: 'ADMIN' });
      const result = await updateUserRole(h.db, {
        targetUserId: '00000000-0000-0000-0000-000000000000',
        newRole: 'MOD',
        actorId: actor.id,
      });
      expect(result).toEqual({ ok: false, error: 'NOT_FOUND' });
    });

    it('blocks actor from changing their own role', async () => {
      const actor = await seedUser(h, { discordId: 'a1', discordUsername: 'admin', role: 'ADMIN' });
      const result = await updateUserRole(h.db, { targetUserId: actor.id, newRole: 'MOD', actorId: actor.id });
      expect(result).toEqual({ ok: false, error: 'CANNOT_CHANGE_OWN_ROLE' });
    });

    it('blocks changing an ADMIN target', async () => {
      const actor = await seedUser(h, { discordId: 'a1', discordUsername: 'admin1', role: 'ADMIN' });
      const target = await seedUser(h, { discordId: 'a2', discordUsername: 'admin2', role: 'ADMIN' });
      const result = await updateUserRole(h.db, { targetUserId: target.id, newRole: 'MOD', actorId: actor.id });
      expect(result).toEqual({ ok: false, error: 'CANNOT_CHANGE_ADMIN' });
    });

    it('rejects invalid role transition (MEMBER to ADMIN)', async () => {
      const actor = await seedUser(h, { discordId: 'a1', discordUsername: 'admin', role: 'ADMIN' });
      const target = await seedUser(h, { discordId: 't1', discordUsername: 'member' });
      const result = await updateUserRole(h.db, {
        targetUserId: target.id,
        newRole: 'ADMIN' as 'MOD',
        actorId: actor.id,
      });
      expect(result).toEqual({ ok: false, error: 'INVALID_ROLE_TRANSITION' });
    });
  });
});
