import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { fail } from './api-response';
import type { NextResponse } from 'next/server';

export interface RateLimitDecision {
  success: boolean;
  remaining: number;
  reset: number;
  limit: number;
}

export interface RateLimiter {
  check(bucket: BucketName, key: string): Promise<RateLimitDecision>;
}

export type BucketName =
  | 'roster.apply'
  | 'teams.create'
  | 'teams.join'
  | 'submissions.create'
  | 'upload-url'
  | 'admin.roles'
  | 'admin.tournaments.write'
  | 'admin.users.search';

export interface BucketConfig {
  limit: number;
  windowSeconds: number;
}

export const BUCKETS: Record<BucketName, BucketConfig> = {
  'roster.apply': { limit: 3, windowSeconds: 24 * 60 * 60 },
  'teams.create': { limit: 10, windowSeconds: 60 * 60 },
  'teams.join': { limit: 10, windowSeconds: 60 * 60 },
  'submissions.create': { limit: 30, windowSeconds: 60 * 60 },
  'upload-url': { limit: 30, windowSeconds: 60 * 60 },
  'admin.roles': { limit: 20, windowSeconds: 60 * 60 },
  'admin.tournaments.write': { limit: 50, windowSeconds: 60 * 60 },
  'admin.users.search': { limit: 120, windowSeconds: 60 * 60 },
};

const NOOP_LIMITER: RateLimiter = {
  async check(bucket) {
    const cfg = BUCKETS[bucket];
    return {
      success: true,
      remaining: cfg.limit,
      reset: Date.now() + cfg.windowSeconds * 1000,
      limit: cfg.limit,
    };
  },
};

function createUpstashLimiter(redis: Redis): RateLimiter {
  const cache = new Map<BucketName, Ratelimit>();
  function getInstance(bucket: BucketName): Ratelimit {
    const existing = cache.get(bucket);
    if (existing) return existing;
    const cfg = BUCKETS[bucket];
    const instance = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(cfg.limit, `${cfg.windowSeconds} s`),
      prefix: `ntl:rl:${bucket}`,
      analytics: false,
    });
    cache.set(bucket, instance);
    return instance;
  }
  return {
    async check(bucket, key) {
      const cfg = BUCKETS[bucket];
      const result = await getInstance(bucket).limit(key);
      return {
        success: result.success,
        remaining: result.remaining,
        reset: result.reset,
        limit: cfg.limit,
      };
    },
  };
}

export function createRateLimiter(): RateLimiter {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    if (process.env.NODE_ENV === 'production') {
      // eslint-disable-next-line no-console
      console.warn(
        '[rate-limit] Upstash env vars missing in production — failing open.',
      );
    }
    return NOOP_LIMITER;
  }
  const redis = new Redis({ url, token });
  return createUpstashLimiter(redis);
}

let limiterInstance: RateLimiter | null = null;

export function getRateLimiter(): RateLimiter {
  if (!limiterInstance) {
    limiterInstance = createRateLimiter();
  }
  return limiterInstance;
}

export function __setRateLimiterForTest(limiter: RateLimiter | null): void {
  limiterInstance = limiter;
}

export function __resetRateLimiterForTest(): void {
  limiterInstance = null;
}

export async function enforceRateLimit(
  limiter: RateLimiter,
  bucket: BucketName,
  key: string,
): Promise<NextResponse | null> {
  const decision = await limiter.check(bucket, key);
  if (decision.success) return null;
  const retryAfterSec = Math.max(1, Math.ceil((decision.reset - Date.now()) / 1000));
  return fail('RATE_LIMITED', 429, {
    headers: { 'Retry-After': String(retryAfterSec) },
  });
}
