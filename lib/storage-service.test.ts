// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb, type TestDbHandle } from './db-test';
import { requestUploadUrl, type StorageAdapter } from './storage-service';
import { teams, tournaments, users } from '@/db/schema';

interface Setup {
  captain: string;
  partner: string;
  outsider: string;
  mod: string;
  tournamentId: string;
  teamId: string;
}

async function setup(
  h: TestDbHandle,
  opts?: { startsAt?: Date; endsAt?: Date; status?: 'DRAFT' | 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | 'ARCHIVED' },
): Promise<Setup> {
  const [cap] = await h.db.insert(users).values({ discordId: '1', discordUsername: 'cap' }).returning();
  const [par] = await h.db.insert(users).values({ discordId: '2', discordUsername: 'par' }).returning();
  const [out] = await h.db.insert(users).values({ discordId: '3', discordUsername: 'out' }).returning();
  const [mod] = await h.db.insert(users).values({ discordId: '4', discordUsername: 'mod', role: 'MOD' }).returning();
  const [t] = await h.db.insert(tournaments).values({
    name: 'Cup',
    registrationDeadline: new Date('2026-04-20T00:00:00Z'),
    startsAt: opts?.startsAt ?? new Date('2026-04-22T00:00:00Z'),
    endsAt: opts?.endsAt ?? new Date('2026-04-30T00:00:00Z'),
    status: opts?.status ?? 'IN_PROGRESS',
    createdBy: mod.id,
  }).returning();
  const [team] = await h.db.insert(teams).values({
    tournamentId: t.id,
    captainId: cap.id,
    partnerId: par.id,
    name: 'Team A',
  }).returning();
  return {
    captain: cap.id,
    partner: par.id,
    outsider: out.id,
    mod: mod.id,
    tournamentId: t.id,
    teamId: team.id,
  };
}

const NOW = new Date('2026-04-25T12:00:00Z');

function fakeAdapter(overrides?: Partial<StorageAdapter>): StorageAdapter {
  return {
    bucket: 'screenshots',
    publicBaseUrl: 'https://example.supabase.co/storage/v1/object/public/screenshots/',
    createSignedUploadUrl: async (path: string) => ({
      signedUrl: `https://example.supabase.co/storage/v1/object/upload/sign/${path}?token=fake`,
      token: 'fake-token',
      path,
    }),
    ...overrides,
  };
}

describe('storage-service', () => {
  let h: TestDbHandle;
  beforeEach(async () => {
    h = await createTestDb();
  });
  afterEach(async () => {
    await h.close();
  });

  describe('requestUploadUrl (submission)', () => {
    it('captain receives a signed URL with submission path', async () => {
      const s = await setup(h);
      const result = await requestUploadUrl(
        h.db,
        {
          kind: 'submission',
          actorId: s.captain,
          tournamentId: s.tournamentId,
          teamId: s.teamId,
          matchId: 'm1',
          contentType: 'image/png',
        },
        fakeAdapter(),
        NOW,
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.path.startsWith(`${s.tournamentId}/${s.teamId}/m1-`)).toBe(true);
        expect(result.value.path.endsWith('.png')).toBe(true);
        expect(result.value.publicUrl.startsWith(
          'https://example.supabase.co/storage/v1/object/public/screenshots/',
        )).toBe(true);
        expect(result.value.signedUrl).toContain('upload/sign');
        expect(result.value.token).toBe('fake-token');
      }
    });

    it('non-captain (partner) cannot request submission upload URL', async () => {
      const s = await setup(h);
      const result = await requestUploadUrl(
        h.db,
        {
          kind: 'submission',
          actorId: s.partner,
          tournamentId: s.tournamentId,
          teamId: s.teamId,
          matchId: 'm1',
          contentType: 'image/png',
        },
        fakeAdapter(),
        NOW,
      );
      expect(result).toEqual({ ok: false, error: 'NOT_CAPTAIN' });
    });

    it('rejects when team not found', async () => {
      const s = await setup(h);
      const result = await requestUploadUrl(
        h.db,
        {
          kind: 'submission',
          actorId: s.captain,
          tournamentId: s.tournamentId,
          teamId: '00000000-0000-0000-0000-000000000000',
          matchId: 'm1',
          contentType: 'image/png',
        },
        fakeAdapter(),
        NOW,
      );
      expect(result).toEqual({ ok: false, error: 'TEAM_NOT_FOUND' });
    });

    it('rejects when team belongs to a different tournament', async () => {
      const s = await setup(h);
      const [other] = await h.db.insert(tournaments).values({
        name: 'Other',
        registrationDeadline: new Date('2026-04-20T00:00:00Z'),
        startsAt: new Date('2026-04-22T00:00:00Z'),
        endsAt: new Date('2026-04-30T00:00:00Z'),
        status: 'IN_PROGRESS',
        createdBy: s.mod,
      }).returning();
      const result = await requestUploadUrl(
        h.db,
        {
          kind: 'submission',
          actorId: s.captain,
          tournamentId: other.id,
          teamId: s.teamId,
          matchId: 'm1',
          contentType: 'image/png',
        },
        fakeAdapter(),
        NOW,
      );
      expect(result).toEqual({ ok: false, error: 'TEAM_NOT_FOUND' });
    });

    it('rejects when tournament window is closed (after end)', async () => {
      const s = await setup(h, {
        startsAt: new Date('2026-04-01T00:00:00Z'),
        endsAt: new Date('2026-04-10T00:00:00Z'),
      });
      const result = await requestUploadUrl(
        h.db,
        {
          kind: 'submission',
          actorId: s.captain,
          tournamentId: s.tournamentId,
          teamId: s.teamId,
          matchId: 'm1',
          contentType: 'image/png',
        },
        fakeAdapter(),
        NOW,
      );
      expect(result).toEqual({ ok: false, error: 'WINDOW_CLOSED' });
    });

    it('rejects when tournament is DRAFT or ARCHIVED', async () => {
      const s = await setup(h, { status: 'ARCHIVED' });
      const result = await requestUploadUrl(
        h.db,
        {
          kind: 'submission',
          actorId: s.captain,
          tournamentId: s.tournamentId,
          teamId: s.teamId,
          matchId: 'm1',
          contentType: 'image/png',
        },
        fakeAdapter(),
        NOW,
      );
      expect(result).toEqual({ ok: false, error: 'TOURNAMENT_NOT_OPEN' });
    });

    it('rejects unsupported content type', async () => {
      const s = await setup(h);
      const result = await requestUploadUrl(
        h.db,
        {
          kind: 'submission',
          actorId: s.captain,
          tournamentId: s.tournamentId,
          teamId: s.teamId,
          matchId: 'm1',
          // @ts-expect-error invalid by design
          contentType: 'application/pdf',
        },
        fakeAdapter(),
        NOW,
      );
      expect(result).toEqual({ ok: false, error: 'BAD_CONTENT_TYPE' });
    });

    it('jpeg → .jpg extension, webp → .webp', async () => {
      const s = await setup(h);
      const jpg = await requestUploadUrl(
        h.db,
        {
          kind: 'submission',
          actorId: s.captain,
          tournamentId: s.tournamentId,
          teamId: s.teamId,
          matchId: 'm1',
          contentType: 'image/jpeg',
        },
        fakeAdapter(),
        NOW,
      );
      expect(jpg.ok).toBe(true);
      if (jpg.ok) expect(jpg.value.path.endsWith('.jpg')).toBe(true);

      const webp = await requestUploadUrl(
        h.db,
        {
          kind: 'submission',
          actorId: s.captain,
          tournamentId: s.tournamentId,
          teamId: s.teamId,
          matchId: 'm2',
          contentType: 'image/webp',
        },
        fakeAdapter(),
        NOW,
      );
      expect(webp.ok).toBe(true);
      if (webp.ok) expect(webp.value.path.endsWith('.webp')).toBe(true);
    });

    it('storage adapter failure surfaces as STORAGE_ERROR', async () => {
      const s = await setup(h);
      const adapter = fakeAdapter({
        createSignedUploadUrl: async () => {
          throw new Error('boom');
        },
      });
      const result = await requestUploadUrl(
        h.db,
        {
          kind: 'submission',
          actorId: s.captain,
          tournamentId: s.tournamentId,
          teamId: s.teamId,
          matchId: 'm1',
          contentType: 'image/png',
        },
        adapter,
        NOW,
      );
      expect(result).toEqual({ ok: false, error: 'STORAGE_ERROR' });
    });
  });

  describe('requestUploadUrl (roster)', () => {
    it('any authed user gets URL with roster/{userId}/... path', async () => {
      const s = await setup(h);
      const result = await requestUploadUrl(
        h.db,
        {
          kind: 'roster',
          actorId: s.outsider,
          contentType: 'image/png',
        },
        fakeAdapter(),
        NOW,
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.path.startsWith(`roster/${s.outsider}/`)).toBe(true);
        expect(result.value.path.endsWith('.png')).toBe(true);
      }
    });

    it('rejects unsupported content type for roster too', async () => {
      const s = await setup(h);
      const result = await requestUploadUrl(
        h.db,
        {
          kind: 'roster',
          actorId: s.outsider,
          // @ts-expect-error invalid by design
          contentType: 'video/mp4',
        },
        fakeAdapter(),
        NOW,
      );
      expect(result).toEqual({ ok: false, error: 'BAD_CONTENT_TYPE' });
    });
  });
});
