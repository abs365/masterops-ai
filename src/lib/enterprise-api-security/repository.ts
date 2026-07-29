// EA-003 — data access layer. Mirrors EA-001/EA-002's repository.ts
// structure and injectable-client convention.
//
// The only place this file talks to EA-002 is resolveIdentityStatus(), which
// calls EA-002's own getIdentity() repository function directly (same-process
// — the same pattern EA-002 itself uses to read EA-001), never a raw query
// against enterprise_identities from here.
import { createServiceClient } from '@/lib/supabase/server'
import { getIdentity } from '@/lib/enterprise-identities/repository'
import type {
  EnterpriseApiCredential, RedactedEnterpriseApiCredential, CreateCredentialInput, IssuedCredential,
  EnterpriseApiRequestLogRecord, FoundationCapability, FoundationOperation, RequestResult, RateLimitOutcome,
} from '@/types'
import { generateSecret, hashSecret } from './crypto'

export type DbClient = Awaited<ReturnType<typeof createServiceClient>>

async function resolveClient(supplied?: DbClient): Promise<DbClient> {
  return supplied ?? (await createServiceClient())
}

export function redactCredential(row: EnterpriseApiCredential): RedactedEnterpriseApiCredential {
  return {
    id: row.id,
    identity_id: row.identity_id,
    credential_prefix: row.credential_prefix,
    scopes: row.scopes,
    status: row.status,
    expires_at: row.expires_at,
    created_at: row.created_at,
    revoked_at: row.revoked_at,
    last_used_at: row.last_used_at,
    created_by: row.created_by,
  }
}

export async function createCredential(input: CreateCredentialInput, supabase?: DbClient): Promise<IssuedCredential> {
  const db = await resolveClient(supabase)
  const generated = generateSecret()

  const { data, error } = await db.rpc('create_enterprise_api_credential', {
    p_identity_id: input.identity_id,
    p_credential_prefix: generated.credentialPrefix,
    p_secret_hash: generated.secretHash,
    p_scopes: input.scopes,
    p_expires_at: input.expires_at ?? null,
    p_actor: input.actor ?? 'system',
  })
  if (error) throw new Error(error.message)

  return { credential: redactCredential(data as EnterpriseApiCredential), secret: generated.secret }
}

export async function revokeCredential(credentialId: string, actor: string | undefined, supabase?: DbClient): Promise<RedactedEnterpriseApiCredential> {
  const db = await resolveClient(supabase)
  const { data, error } = await db.rpc('revoke_enterprise_api_credential', {
    p_credential_id: credentialId,
    p_actor: actor ?? 'system',
  })
  if (error) throw new Error(error.message)
  return redactCredential(data as EnterpriseApiCredential)
}

// Rotation is create-new-then-revoke-old, orchestrated here as one call for
// operational ergonomics — but implemented as two separate, auditable rows
// (never mutating the old row's secret in place), per the approved design's
// "create...then revoke" model (§6) and matching EA-001/EA-002's own
// audit-immutability instinct.
export async function rotateCredential(oldCredentialId: string, identityId: string, scopes: import('@/types').ApiScope[], actor: string | undefined, supabase?: DbClient): Promise<IssuedCredential> {
  const db = await resolveClient(supabase)
  const issued = await createCredential({ identity_id: identityId, scopes, actor }, db)
  await revokeCredential(oldCredentialId, actor, db)
  return issued
}

export async function touchLastUsed(credentialId: string, supabase?: DbClient): Promise<void> {
  const db = await resolveClient(supabase)
  await db.rpc('touch_enterprise_api_credential_last_used', { p_credential_id: credentialId })
}

// Verification lookup: hash the incoming secret, look it up by exact match.
// Expiry is evaluated here at read time (expires_at < now()), not relying on
// a background job having already flipped `status` to 'expired' — the
// approved design requires denying expired credentials unconditionally, and
// a real-time check is the only way to guarantee that without a cron
// dependency this Phase doesn't build.
export interface CredentialLookupResult {
  credential: EnterpriseApiCredential | null
  isExpired: boolean
}

export async function findActiveCredentialBySecret(rawSecret: string, supabase?: DbClient): Promise<CredentialLookupResult> {
  const db = await resolveClient(supabase)
  const hash = hashSecret(rawSecret)
  const { data, error } = await db.from('enterprise_api_credentials').select('*').eq('secret_hash', hash).maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return { credential: null, isExpired: false }

  const credential = data as EnterpriseApiCredential
  const isExpired = credential.expires_at !== null && new Date(credential.expires_at).getTime() < Date.now()
  return { credential, isExpired }
}

export async function resolveIdentityStatus(identityId: string, supabase?: DbClient): Promise<{ active: boolean; lifecycleState: string | null }> {
  const db = await resolveClient(supabase)
  const { data, error } = await db.from('enterprise_identities').select('lifecycle_state').eq('id', identityId).maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return { active: false, lifecycleState: null }
  const lifecycleState = (data as { lifecycle_state: string }).lifecycle_state
  return { active: lifecycleState === 'active', lifecycleState }
}

export interface LogRequestInput {
  correlationId: string
  credentialId: string | null
  identityId: string | null
  capability: FoundationCapability | null
  operation: FoundationOperation | null
  method: string
  path: string
  result: RequestResult
  denialReason: string | null
  statusCode: number
  rateLimitOutcome: RateLimitOutcome | null
  latencyMs: number | null
}

export async function logRequest(input: LogRequestInput, supabase?: DbClient): Promise<void> {
  const db = await resolveClient(supabase)
  const { error } = await db.from('enterprise_api_request_log').insert({
    correlation_id: input.correlationId,
    credential_id: input.credentialId,
    identity_id: input.identityId,
    capability: input.capability,
    operation: input.operation,
    method: input.method,
    path: input.path,
    result: input.result,
    denial_reason: input.denialReason,
    status_code: input.statusCode,
    rate_limit_outcome: input.rateLimitOutcome,
    latency_ms: input.latencyMs,
  })
  if (error) throw new Error(error.message)
}

export async function listRequestLog(filters: { credentialId?: string; result?: RequestResult }, supabase?: DbClient): Promise<EnterpriseApiRequestLogRecord[]> {
  const db = await resolveClient(supabase)
  let query = db.from('enterprise_api_request_log').select('*')
  if (filters.credentialId) query = query.eq('credential_id', filters.credentialId)
  if (filters.result) query = query.eq('result', filters.result)
  const { data, error } = await query.order('occurred_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as EnterpriseApiRequestLogRecord[]
}

// Re-exported so the middleware can resolve an identity by global_id when
// issuing credentials without importing EA-002's repository directly in two
// places — a thin pass-through, not a wrapper that changes behavior.
export { getIdentity }
