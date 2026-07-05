// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { requestUploadUrl, type StorageAdapter } from './storage-service';

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
  describe('requestUploadUrl (roster)', () => {
    it('any authed user gets URL with roster/{userId}/... path', async () => {
      const result = await requestUploadUrl(
        { kind: 'roster', actorId: 'user-1', contentType: 'image/png' },
        fakeAdapter(),
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.path.startsWith('roster/user-1/')).toBe(true);
        expect(result.value.path.endsWith('.png')).toBe(true);
        expect(result.value.publicUrl.startsWith(
          'https://example.supabase.co/storage/v1/object/public/screenshots/',
        )).toBe(true);
        expect(result.value.signedUrl).toContain('upload/sign');
        expect(result.value.token).toBe('fake-token');
      }
    });

    it('jpeg → .jpg extension, webp → .webp', async () => {
      const jpg = await requestUploadUrl(
        { kind: 'roster', actorId: 'user-1', contentType: 'image/jpeg' },
        fakeAdapter(),
      );
      expect(jpg.ok).toBe(true);
      if (jpg.ok) expect(jpg.value.path.endsWith('.jpg')).toBe(true);

      const webp = await requestUploadUrl(
        { kind: 'roster', actorId: 'user-1', contentType: 'image/webp' },
        fakeAdapter(),
      );
      expect(webp.ok).toBe(true);
      if (webp.ok) expect(webp.value.path.endsWith('.webp')).toBe(true);
    });

    it('rejects unsupported content type', async () => {
      const result = await requestUploadUrl(
        {
          kind: 'roster',
          actorId: 'user-1',
          // @ts-expect-error invalid by design
          contentType: 'video/mp4',
        },
        fakeAdapter(),
      );
      expect(result).toEqual({ ok: false, error: 'BAD_CONTENT_TYPE' });
    });

    it('storage adapter failure surfaces as STORAGE_ERROR', async () => {
      const adapter = fakeAdapter({
        createSignedUploadUrl: async () => {
          throw new Error('boom');
        },
      });
      const result = await requestUploadUrl(
        { kind: 'roster', actorId: 'user-1', contentType: 'image/png' },
        adapter,
      );
      expect(result).toEqual({ ok: false, error: 'STORAGE_ERROR' });
    });
  });
});
