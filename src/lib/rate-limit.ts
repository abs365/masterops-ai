import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

export type RateLimitResult = {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

let redis: Redis | null = null
const limiters = new Map<string, Ratelimit>()

function getRedis(): Redis | null {
  if (redis) return redis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  redis = new Redis({ url, token })
  return redis
}

function getLimiter(key: string, requests: number, window: string): Ratelimit | null {
  const client = getRedis()
  if (!client) return null
  const cacheKey = `${key}:${requests}:${window}`
  if (!limiters.has(cacheKey)) {
    limiters.set(
      cacheKey,
      new Ratelimit({
        redis: client,
        limiter: Ratelimit.slidingWindow(requests, window as `${number} ${'ms' | 's' | 'm' | 'h' | 'd'}`),
        prefix: `masterops:rl:${key}`,
      }),
    )
  }
  return limiters.get(cacheKey)!
}

/**
 * Check rate limit for an identifier.
 * Fails open (success: true) when Upstash env vars are not configured.
 */
export async function rateLimit(
  identifier: string,
  options: { key: string; requests: number; window: string } = {
    key: 'global',
    requests: 60,
    window: '1 m',
  },
): Promise<RateLimitResult> {
  const limiter = getLimiter(options.key, options.requests, options.window)

  if (!limiter) {
    return { success: true, limit: options.requests, remaining: options.requests, reset: 0 }
  }

  const result = await limiter.limit(identifier)
  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  }
}
