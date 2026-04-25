import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { requireUser } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import {
  countUnreadForUser,
  listNotificationsForUser,
  markNotificationsRead,
} from '@/lib/notifications-service';

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return fail(auth.error, auth.status);

  const unreadOnly = req.nextUrl.searchParams.get('unread') === '1';
  const items = await listNotificationsForUser(db, auth.user.id, {
    unreadOnly,
  });
  const unreadCount = await countUnreadForUser(db, auth.user.id);
  return ok({ items, unreadCount });
}

const patchSchema = z.union([
  z.object({
    ids: z.array(z.string().uuid()).min(1).max(100),
    markAll: z.never().optional(),
  }),
  z.object({
    markAll: z.literal(true),
    ids: z.never().optional(),
  }),
]);

export async function PATCH(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return fail(auth.error, auth.status);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail('Invalid JSON', 400);
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? 'Invalid input', 400);
  }

  const data = parsed.data;
  const result = await markNotificationsRead(db, {
    userId: auth.user.id,
    ids: 'ids' in data ? data.ids : undefined,
    markAll: 'markAll' in data ? data.markAll : undefined,
  });
  if (!result.ok) return fail(result.error, 400);
  return ok(result.value);
}
