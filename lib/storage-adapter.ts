import { createClient } from '@supabase/supabase-js';
import type { StorageAdapter } from './storage-service';

export function getSupabaseStorageConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET;
  if (!url || !serviceKey || !bucket) return null;
  return { url: url.replace(/\/$/, ''), serviceKey, bucket };
}

export function createSupabaseAdapter(): StorageAdapter | null {
  const cfg = getSupabaseStorageConfig();
  if (!cfg) return null;

  const client = createClient(cfg.url, cfg.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return {
    bucket: cfg.bucket,
    publicBaseUrl: `${cfg.url}/storage/v1/object/public/${cfg.bucket}/`,
    createSignedUploadUrl: async (path) => {
      const { data, error } = await client.storage
        .from(cfg.bucket)
        .createSignedUploadUrl(path);
      if (error || !data) {
        throw error ?? new Error('Failed to create signed upload URL');
      }
      return {
        signedUrl: data.signedUrl,
        token: data.token,
        path: data.path,
      };
    },
  };
}
