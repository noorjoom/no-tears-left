import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import { getRateLimiter, enforceRateLimit } from '@/lib/rate-limit';
import { searchUsers } from '@/lib/users-service';
import { db } from '@/db';

const MAX_LIMIT = 50;
const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 50;

export async function GET(req: NextRequest) {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return fail(auth.error, auth.status);

  const rateLimited = await enforceRateLimit(getRateLimiter(), 'admin.users.search', auth.user.id);
  if (rateLimited) return rateLimited;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') ?? '';
  if (q.length < MIN_QUERY_LENGTH) {
    return fail(`Query must be at least ${MIN_QUERY_LENGTH} characters`, 400);
  }
  if (q.length > MAX_QUERY_LENGTH) {
    return fail(`Query must be at most ${MAX_QUERY_LENGTH} characters`, 400);
  }

  const limitParam = searchParams.get('limit');
  const parsedLimit = limitParam ? parseInt(limitParam, 10) : NaN;
  const limit = Math.min(
    Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : MAX_LIMIT,
    MAX_LIMIT,
  );

  const results = await searchUsers(db, q, limit);
  return ok(results);
}
