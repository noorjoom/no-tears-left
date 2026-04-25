import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import {
  createApplication,
  listApprovedRoster,
  type CreateError,
} from '@/lib/roster-service';
import { requireUser } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import { PLATFORMS, WHY_TEXT_MAX_LENGTH } from '@/lib/constants';

const createSchema = z.object({
  epicUsername: z.string().trim().min(1).max(64),
  platform: z.enum(PLATFORMS),
  timezone: z.string().trim().min(1).max(64),
  whyText: z.string().trim().min(1).max(WHY_TEXT_MAX_LENGTH),
  vodUrl: z.string().url().max(500).optional().nullable(),
});

const CREATE_ERROR_STATUS: Record<CreateError, number> = {
  WHY_TEXT_TOO_LONG: 400,
  ALREADY_HAS_PENDING: 409,
  ALREADY_APPROVED: 409,
  COOLDOWN_ACTIVE: 429,
};

export async function GET() {
  const list = await listApprovedRoster(db);
  return ok(list);
}

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return fail(auth.error, auth.status);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail('Invalid JSON', 400);
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? 'Invalid input', 400);
  }

  const result = await createApplication(db, {
    userId: auth.user.id,
    ...parsed.data,
  });
  if (!result.ok) {
    return fail(result.error, CREATE_ERROR_STATUS[result.error]);
  }
  return ok(result.value, { status: 201 });
}
