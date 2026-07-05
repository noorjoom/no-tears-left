import { randomUUID } from 'node:crypto';

export type ServiceResult<T, E = string> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export type SupportedContentType = 'image/png' | 'image/jpeg' | 'image/webp';

const CONTENT_TYPE_EXT: Record<SupportedContentType, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

export interface SignedUploadHandle {
  signedUrl: string;
  token: string;
  path: string;
}

export interface StorageAdapter {
  bucket: string;
  publicBaseUrl: string;
  createSignedUploadUrl: (path: string) => Promise<SignedUploadHandle>;
}

export type RosterUploadInput = {
  kind: 'roster';
  actorId: string;
  contentType: SupportedContentType;
};

export type RequestUploadUrlInput = RosterUploadInput;

export type UploadUrlError = 'BAD_CONTENT_TYPE' | 'STORAGE_ERROR';

export interface UploadUrlResult {
  path: string;
  signedUrl: string;
  token: string;
  publicUrl: string;
}

function extFor(contentType: string): string | null {
  if (contentType in CONTENT_TYPE_EXT) {
    return CONTENT_TYPE_EXT[contentType as SupportedContentType];
  }
  return null;
}

export async function requestUploadUrl(
  input: RequestUploadUrlInput,
  adapter: StorageAdapter,
): Promise<ServiceResult<UploadUrlResult, UploadUrlError>> {
  const ext = extFor(input.contentType);
  if (!ext) return { ok: false, error: 'BAD_CONTENT_TYPE' };

  const path = `roster/${input.actorId}/${randomUUID()}.${ext}`;

  let handle: SignedUploadHandle;
  try {
    handle = await adapter.createSignedUploadUrl(path);
  } catch {
    return { ok: false, error: 'STORAGE_ERROR' };
  }

  const base = adapter.publicBaseUrl.replace(/\/$/, '');
  return {
    ok: true,
    value: {
      path: handle.path,
      signedUrl: handle.signedUrl,
      token: handle.token,
      publicUrl: `${base}/${handle.path}`,
    },
  };
}
