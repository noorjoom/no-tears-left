import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  requestUploadUrl,
  type UploadUrlError,
} from '@/lib/storage-service';
import { createSupabaseAdapter } from '@/lib/storage-adapter';
import { requireUser } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import { enforceRateLimit, getRateLimiter } from '@/lib/rate-limit';

const contentType = z.enum(['image/png', 'image/jpeg', 'image/webp']);

const bodySchema = z.object({
  kind: z.literal('roster'),
  contentType,
});

const ERROR_STATUS: Record<UploadUrlError, number> = {
  BAD_CONTENT_TYPE: 400,
  STORAGE_ERROR: 502,
};

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return fail(auth.error, auth.status);

  const limited = await enforceRateLimit(getRateLimiter(), 'upload-url', auth.user.id);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail('Invalid JSON', 400);
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? 'Invalid input', 400);
  }

  const adapter = createSupabaseAdapter();
  if (!adapter) {
    return fail('Storage is not configured', 503);
  }

  const result = await requestUploadUrl(
    { ...parsed.data, actorId: auth.user.id },
    adapter,
  );
  if (!result.ok) return fail(result.error, ERROR_STATUS[result.error]);
  return ok(result.value, { status: 201 });
}
