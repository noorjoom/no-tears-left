// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  BUCKETS,
  createRateLimiter,
  enforceRateLimit,
  getRateLimiter,
  __resetRateLimiterForTest,
  __setRateLimiterForTest,
} from './rate-limit';
import { createFakeRateLimiter } from './rate-limit-fake';

describe('BUCKETS registry', () => {
  it('matches ARCHITECTURE.md §8', () => {
    expect(BUCKETS['roster.apply']).toEqual({ limit: 3, windowSeconds: 24 * 60 * 60 });
    expect(BUCKETS['teams.create']).toEqual({ limit: 10, windowSeconds: 60 * 60 });
    expect(BUCKETS['teams.join']).toEqual({ limit: 10, windowSeconds: 60 * 60 });
    expect(BUCKETS['submissions.create']).toEqual({ limit: 30, windowSeconds: 60 * 60 });
    expect(BUCKETS['upload-url']).toEqual({ limit: 30, windowSeconds: 60 * 60 });
  });
});

describe('createRateLimiter (env-driven)', () => {
  const prevUrl = process.env.UPSTASH_REDIS_REST_URL;
  const prevToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  afterEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = prevUrl;
    process.env.UPSTASH_REDIS_REST_TOKEN = prevToken;
  });

  it('returns a noop limiter (always success) when env vars are unset', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    const limiter = createRateLimiter();
    const decision = await limiter.check('roster.apply', 'user-123');
    expect(decision.success).toBe(true);
    expect(decision.limit).toBe(3);
  });
});

describe('getRateLimiter test override', () => {
  beforeEach(() => __resetRateLimiterForTest());
  afterEach(() => __resetRateLimiterForTest());

  it('returns the injected limiter', async () => {
    const fake = createFakeRateLimiter({ allow: false });
    __setRateLimiterForTest(fake);
    const decision = await getRateLimiter().check('teams.create', 'u1');
    expect(decision.success).toBe(false);
  });
});

describe('enforceRateLimit', () => {
  it('returns null when the limiter allows the request', async () => {
    const fake = createFakeRateLimiter({ allow: true });
    const result = await enforceRateLimit(fake, 'roster.apply', 'user-1');
    expect(result).toBeNull();
    expect(fake.calls).toEqual([{ bucket: 'roster.apply', key: 'user-1' }]);
  });

  it('returns a 429 NextResponse with Retry-After when blocked', async () => {
    const reset = Date.now() + 60_000;
    const fake = createFakeRateLimiter({ allow: false, reset });
    const result = await enforceRateLimit(fake, 'submissions.create', 'user-2');
    expect(result).not.toBeNull();
    expect(result!.status).toBe(429);
    const retryAfter = result!.headers.get('Retry-After');
    expect(retryAfter).not.toBeNull();
    expect(Number(retryAfter)).toBeGreaterThan(0);
    expect(Number(retryAfter)).toBeLessThanOrEqual(61);
    const body = await result!.json();
    expect(body).toEqual({ success: false, error: 'RATE_LIMITED' });
  });

  it('clamps Retry-After to at least 1 second', async () => {
    const fake = createFakeRateLimiter({ allow: false, reset: Date.now() - 5000 });
    const result = await enforceRateLimit(fake, 'roster.apply', 'user-3');
    expect(result!.headers.get('Retry-After')).toBe('1');
  });
});
