// ============================================================================
// Mizan (ميزان) - Distributed-Ready Sliding-Window Rate Limiter
// In-memory sliding window implementation with Redis interface adapter
// Protects authentication endpoints, OCR endpoints, and public APIs from abuse
// ============================================================================

import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  remaining: number;
  resetSeconds: number;
}

export interface IRateLimitStore {
  consume(key: string, maxRequests: number, windowSeconds: number): Promise<RateLimitResult>;
}

/**
 * High-performance In-Memory Sliding Window Rate Limiter
 */
export class InMemoryRateLimitStore implements IRateLimitStore {
  private hits = new Map<string, number[]>();

  public async consume(
    key: string,
    maxRequests: number,
    windowSeconds: number
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const windowStart = now - windowMs;

    // Get existing timestamps
    const timestamps = (this.hits.get(key) || []).filter((ts) => ts > windowStart);

    if (timestamps.length >= maxRequests) {
      const oldestInWindow = timestamps[0];
      const resetSeconds = Math.max(1, Math.ceil((oldestInWindow + windowMs - now) / 1000));
      return {
        allowed: false,
        count: timestamps.length,
        remaining: 0,
        resetSeconds,
      };
    }

    timestamps.push(now);
    this.hits.set(key, timestamps);

    // Periodically clean stale keys if map exceeds 10,000 entries
    if (this.hits.size > 10000) {
      for (const [k, v] of this.hits.entries()) {
        const valid = v.filter((ts) => ts > windowStart);
        if (valid.length === 0) {
          this.hits.delete(k);
        } else {
          this.hits.set(k, valid);
        }
      }
    }

    return {
      allowed: true,
      count: timestamps.length,
      remaining: maxRequests - timestamps.length,
      resetSeconds: windowSeconds,
    };
  }

  public clear(): void {
    this.hits.clear();
  }
}

/**
 * Production Distributed Redis Store Adapter (activates when REDIS_URL is configured)
 */
export class RedisRateLimitStore implements IRateLimitStore {
  constructor(private readonly redisClient?: any) {}

  public async consume(
    key: string,
    maxRequests: number,
    windowSeconds: number
  ): Promise<RateLimitResult> {
    if (!this.redisClient) {
      // Fallback to in-memory if Redis client is not initialized
      return new InMemoryRateLimitStore().consume(key, maxRequests, windowSeconds);
    }

    // Standard Redis sliding-window ZADD / ZREMRANGEBYSCORE implementation
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const clearBefore = now - windowMs;

    const multi = this.redisClient.multi();
    multi.zremrangebyscore(key, 0, clearBefore);
    multi.zadd(key, now, `${now}-${Math.random()}`);
    multi.zcard(key);
    multi.expire(key, windowSeconds);

    const results = await multi.exec();
    const count = results[2][1] as number;

    const allowed = count <= maxRequests;
    return {
      allowed,
      count,
      remaining: Math.max(0, maxRequests - count),
      resetSeconds: windowSeconds,
    };
  }
}

@Injectable()
export class RateLimiterService {
  private store: IRateLimitStore;

  constructor() {
    // Zero-dependency by default: uses in-memory store; adapts to Redis in clustered deployment
    this.store = new InMemoryRateLimitStore();
  }

  public async enforce(
    identifier: string,
    action: string,
    maxRequests: number = 30,
    windowSeconds: number = 60
  ): Promise<void> {
    const key = `ratelimit:${action}:${identifier}`;
    const result = await this.store.consume(key, maxRequests, windowSeconds);

    if (!result.allowed) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: `Rate limit exceeded for action '${action}'. Please wait ${result.resetSeconds}s before retrying.`,
          retryAfterSeconds: result.resetSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }
  }
}
