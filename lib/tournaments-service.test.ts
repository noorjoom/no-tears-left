// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb, type TestDbHandle } from './db-test';
import {
  createTournament,
  getTournament,
  listTournaments,
  updateTournament,
} from './tournaments-service';
import { users } from '@/db/schema';

async function seedMod(h: TestDbHandle): Promise<string> {
  const [u] = await h.db
    .insert(users)
    .values({ discordId: '1', discordUsername: 'mod', role: 'MOD' })
    .returning();
  return u.id;
}

const validDates = {
  registrationDeadline: new Date('2026-12-01T00:00:00Z'),
  startsAt: new Date('2026-12-02T00:00:00Z'),
  endsAt: new Date('2026-12-03T00:00:00Z'),
};

describe('tournaments-service', () => {
  let h: TestDbHandle;
  beforeEach(async () => {
    h = await createTestDb();
  });
  afterEach(async () => {
    await h.close();
  });

  it('creates a tournament with default DRAFT status', async () => {
    const mod = await seedMod(h);
    const result = await createTournament(h.db, {
      name: 'Cup', ...validDates, createdBy: mod,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.status).toBe('DRAFT');
  });

  it('rejects dates where registration is after start', async () => {
    const mod = await seedMod(h);
    const result = await createTournament(h.db, {
      name: 'Cup',
      registrationDeadline: new Date('2026-12-05T00:00:00Z'),
      startsAt: new Date('2026-12-02T00:00:00Z'),
      endsAt: new Date('2026-12-03T00:00:00Z'),
      createdBy: mod,
    });
    expect(result).toEqual({ ok: false, error: 'INVALID_DATES' });
  });

  it('rejects dates where end is before start', async () => {
    const mod = await seedMod(h);
    const result = await createTournament(h.db, {
      name: 'Cup',
      registrationDeadline: new Date('2026-11-30T00:00:00Z'),
      startsAt: new Date('2026-12-02T00:00:00Z'),
      endsAt: new Date('2026-12-01T00:00:00Z'),
      createdBy: mod,
    });
    expect(result).toEqual({ ok: false, error: 'INVALID_DATES' });
  });

  it('rejects maxTeams < 1', async () => {
    const mod = await seedMod(h);
    const result = await createTournament(h.db, {
      name: 'Cup', ...validDates, createdBy: mod, maxTeams: 0,
    });
    expect(result).toEqual({ ok: false, error: 'INVALID_MAX_TEAMS' });
  });

  it('lists tournaments newest-first by startsAt (drafts hidden by default)', async () => {
    const mod = await seedMod(h);
    await createTournament(h.db, {
      name: 'Earlier',
      registrationDeadline: new Date('2026-10-01T00:00:00Z'),
      startsAt: new Date('2026-10-02T00:00:00Z'),
      endsAt: new Date('2026-10-03T00:00:00Z'),
      createdBy: mod,
    });
    await createTournament(h.db, {
      name: 'Later', ...validDates, createdBy: mod,
    });
    const all = await listTournaments(h.db, { includeDrafts: true });
    expect(all[0].name).toBe('Later');
    const publicList = await listTournaments(h.db);
    expect(publicList).toHaveLength(0);
  });

  it('updates tournament status (DRAFT → OPEN)', async () => {
    const mod = await seedMod(h);
    const created = await createTournament(h.db, {
      name: 'Cup', ...validDates, createdBy: mod,
    });
    if (!created.ok) throw new Error('seed failed');
    const result = await updateTournament(h.db, created.value.id, { status: 'OPEN' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.status).toBe('OPEN');
  });

  it('update returns NOT_FOUND for missing id', async () => {
    const result = await updateTournament(
      h.db,
      '00000000-0000-0000-0000-000000000000',
      { status: 'OPEN' },
    );
    expect(result).toEqual({ ok: false, error: 'NOT_FOUND' });
  });

  it('getTournament returns null for missing id', async () => {
    const t = await getTournament(h.db, '00000000-0000-0000-0000-000000000000');
    expect(t).toBeNull();
  });
});
