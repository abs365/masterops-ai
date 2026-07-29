// EA-003 Secure Foundation API — types (Phase 0).
export type CredentialStatus = 'active' | 'revoked' | 'expired'

export type FoundationCapability = 'enterprise-assets' | 'enterprise-identities'
export type FoundationOperation = 'read' | 'write'
export type ApiScope = `${FoundationCapability}:${FoundationOperation}`

export type RequestResult = 'allowed' | 'denied'
export type RateLimitOutcome = 'allowed' | 'limited' | 'unavailable' | 'not_applicable'

export interface EnterpriseApiCredential {
  id: string
  identity_id: string
  credential_prefix: string
  secret_hash: string
  scopes: string[]
  status: CredentialStatus
  expires_at: string | null
  created_at: string
  revoked_at: string | null
  last_used_at: string | null
  created_by: string
}

// Same shape as EnterpriseApiCredential minus secret_hash — the only shape
// ever returned from an API response or logged, per the design's "never
// expose stored credential material" requirement.
export type RedactedEnterpriseApiCredential = Omit<EnterpriseApiCredential, 'secret_hash'>

export interface EnterpriseApiCredentialAuditRecord {
  id: string
  credential_id: string | null
  action: 'CredentialCreated' | 'CredentialRotated' | 'CredentialRevoked' | 'CredentialExpired'
  actor: string
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  occurred_at: string
}

export interface EnterpriseApiRequestLogRecord {
  id: string
  correlation_id: string
  credential_id: string | null
  identity_id: string | null
  capability: FoundationCapability | null
  operation: FoundationOperation | null
  method: string
  path: string
  result: RequestResult
  denial_reason: string | null
  status_code: number
  rate_limit_outcome: RateLimitOutcome | null
  latency_ms: number | null
  occurred_at: string
}

export interface CreateCredentialInput {
  identity_id: string
  scopes: ApiScope[]
  expires_at?: string | null
  actor?: string
}

// What issuing (or rotating into) a credential returns — the ONLY moment
// the raw secret is ever available. Never persisted, never logged.
export interface IssuedCredential {
  credential: RedactedEnterpriseApiCredential
  secret: string
}
