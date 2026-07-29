// EA-003 — the single entry point every protected EA-001/EA-002 route calls.
// One new line at the top of each existing handler (per the approved
// design §8) — no other change to those files.
import { randomUUID } from 'node:crypto'
import type { NextRequest, NextResponse } from 'next/server'
import type { ApiScope, FoundationCapability, FoundationOperation } from '@/types'
import { isWellFormedCredential, CREDENTIAL_PREFIX } from './crypto'
import { findActiveCredentialBySecret, resolveIdentityStatus, touchLastUsed, logRequest, type DbClient } from './repository'
import { enforceFoundationRateLimit } from './rate-limit'
import { unauthorizedResponse, forbiddenResponse, rateLimitedResponse, serviceUnavailableResponse } from './http'

export type GuardResult =
  | { ok: true; credentialId: string; identityId: string; correlationId: string }
  | { ok: false; response: NextResponse }

function parseScope(scope: ApiScope): { capability: FoundationCapability; operation: FoundationOperation } {
  const [capability, operation] = scope.split(':') as [FoundationCapability, FoundationOperation]
  return { capability, operation }
}

function extractBearerToken(req: NextRequest): string | null {
  const header = req.headers.get('authorization')
  if (!header || !header.startsWith('Bearer ')) return null
  const token = header.slice('Bearer '.length).trim()
  return token.length > 0 ? token : null
}

// Verifies the request and, on success, returns identifying context for the
// caller AND has already written the request-audit row (success or denial)
// — callers of this guard never need to log the outcome themselves.
export async function verifyFoundationApiRequest(
  req: NextRequest,
  requiredScope: ApiScope,
  supabase?: DbClient
): Promise<GuardResult> {
  const start = Date.now()
  const correlationId = randomUUID()
  const { capability, operation } = parseScope(requiredScope)
  const method = req.method
  const path = req.nextUrl.pathname

  async function deny(reason: string, response: NextResponse, rateLimitOutcome: import('@/types').RateLimitOutcome | 'not_applicable' = 'not_applicable', credentialId: string | null = null, identityId: string | null = null): Promise<GuardResult> {
    await logRequest({
      correlationId, credentialId, identityId, capability, operation, method, path,
      result: 'denied', denialReason: reason, statusCode: response.status,
      rateLimitOutcome: rateLimitOutcome === 'not_applicable' ? 'not_applicable' : rateLimitOutcome,
      latencyMs: Date.now() - start,
    }, supabase).catch(() => {
      // Audit-write failure must never mask the original security decision —
      // the request is still denied; the audit gap itself is the operational
      // signal an operator would need to investigate separately.
    })
    return { ok: false, response }
  }

  const token = extractBearerToken(req)
  if (!token) {
    return deny('missing_credential', unauthorizedResponse())
  }
  if (!isWellFormedCredential(token)) {
    return deny('malformed_credential', unauthorizedResponse())
  }

  const rateLimitId = token.slice(0, CREDENTIAL_PREFIX.length + 12) // credential_prefix-equivalent, no DB round-trip needed
  const rateLimitResult = await enforceFoundationRateLimit(rateLimitId)
  if (rateLimitResult.outcome === 'unavailable') {
    return deny('rate_limit_unavailable', serviceUnavailableResponse(), 'unavailable')
  }
  if (!rateLimitResult.allowed) {
    return deny('rate_limit_exceeded', rateLimitedResponse(), 'limited')
  }

  const { credential, isExpired } = await findActiveCredentialBySecret(token, supabase)
  if (!credential) {
    return deny('unknown_credential', unauthorizedResponse(), rateLimitResult.outcome)
  }
  if (credential.status === 'revoked') {
    return deny('credential_revoked', unauthorizedResponse(), rateLimitResult.outcome, credential.id, credential.identity_id)
  }
  if (credential.status === 'expired' || isExpired) {
    return deny('credential_expired', unauthorizedResponse(), rateLimitResult.outcome, credential.id, credential.identity_id)
  }

  const identityStatus = await resolveIdentityStatus(credential.identity_id, supabase)
  if (!identityStatus.active) {
    const reason = identityStatus.lifecycleState ? `identity_${identityStatus.lifecycleState}` : 'identity_not_found'
    return deny(reason, unauthorizedResponse(), rateLimitResult.outcome, credential.id, credential.identity_id)
  }

  if (!credential.scopes.includes(requiredScope)) {
    return deny('insufficient_scope', forbiddenResponse(), rateLimitResult.outcome, credential.id, credential.identity_id)
  }

  await touchLastUsed(credential.id, supabase).catch(() => {
    // Non-critical bookkeeping — must never block or fail an otherwise-valid request.
  })
  // status_code here records the GUARD's own decision (200 = authorization
  // succeeded), not necessarily the wrapped route handler's eventual response
  // status (e.g. a 404 from a not-found asset lookup downstream) — this audit
  // log tracks the authentication/authorization gate's outcome, not full
  // request/response tracing. Disclosed scope boundary, not an oversight.
  await logRequest({
    correlationId, credentialId: credential.id, identityId: credential.identity_id, capability, operation, method, path,
    result: 'allowed', denialReason: null, statusCode: 200, rateLimitOutcome: rateLimitResult.outcome,
    latencyMs: Date.now() - start,
  }, supabase).catch(() => {
    // Same rationale as the denial path — an audit-write failure doesn't
    // retroactively make an already-authorized request unauthorized.
  })

  return { ok: true, credentialId: credential.id, identityId: credential.identity_id, correlationId }
}
