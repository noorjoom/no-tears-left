import type { BucketName, RateLimitDecision, RateLimiter } from './rate-limit';
import { BUCKETS } from './rate-limit';

export interface FakeLimiterOptions {
  allow?: boolean;
  reset?: number;
  remaining?: number;
}

export interface FakeLimiterHandle extends RateLimiter {
  setAllow(allow: boolean): void;
  calls: Array<{ bucket: BucketName; key: string }>;
}

export function createFakeRateLimiter(opts: FakeLimiterOptions = {}): FakeLimiterHandle {
  let allow = opts.allow ?? true;
  const calls: Array<{ bucket: BucketName; key: string }> = [];
  return {
    calls,
    setAllow(next: boolean) {
      allow = next;
    },
    async check(bucket: BucketName, key: string): Promise<RateLimitDecision> {
      calls.push({ bucket, key });
      const cfg = BUCKETS[bucket];
      return {
        success: allow,
        remaining: allow ? cfg.limit - 1 : 0,
        reset: opts.reset ?? Date.now() + cfg.windowSeconds * 1000,
        limit: cfg.limit,
      };
    },
  };
}
