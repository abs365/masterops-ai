// EA-003 — fail-closed rate limiting wrapper around the existing, shared
// src/lib/rate-limit.ts. That module is deliberately unmodified (per
// instruction: "Do not change unrelated repository routes merely to impose
// this stricter EA-003 boundary") — it fails OPEN when Upstash isn't
// configured, which is correct for its other callers but wrong for
// Foundation API routes, which must fail CLOSED per the approved design.
//
// The distinction is made here, not by changing the shared module: this
// wrapper checks for Upstash configuration itself, BEFORE calling the shared
// limiter, so "not configured" and "configured and under budget" are never
// conflated the way the shared module's own return value conflates them.
import { rateLimit } from '@/lib/rate-limit'
import { DEFAULT_RATE_LIMIT_REQUESTS, DEFAULT_RATE_LIMIT_WINDOW, RATE_LIMIT_KEY } from './constants'
import type { RateLimitOutcome } from '@/types'

export interface FoundationRateLimitResult {
  allowed: boolean
  outcome: RateLimitOutcome
}

export async function enforceFoundationRateLimit(identifier: string): Promise<FoundationRateLimitResult> {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return { allowed: false, outcome: 'unavailable' }
  }

  const result = await rateLimit(identifier, {
    key: RATE_LIMIT_KEY,
    requests: DEFAULT_RATE_LIMIT_REQUESTS,
    window: DEFAULT_RATE_LIMIT_WINDOW,
  })

  return { allowed: result.success, outcome: result.success ? 'allowed' : 'limited' }
}
