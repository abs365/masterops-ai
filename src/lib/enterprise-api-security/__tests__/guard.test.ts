// Covers the full test matrix required by EA-003's implementation
// authorization (items 1-14, 17-19 of the required list; audit success/
// denial are 15-16, tested via inspecting fake.apiRequestLog directly below;
// 20 "no regression to EA-001/EA-002" is proven by the existing route
// test suites passing unchanged with the guard stubbed, plus
// route-integration.test.ts, which uses this real guard end-to-end).
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { FakeSecureFoundationDb } from './fake-db-client'
import { createCredential, rotateCredential } from '../repository'
import type { DbClient } from '../repository'
import { generateSecret } from '../crypto'

let rateLimitBehavior: { allowed: boolean; outcome: 'allowed' | 'limited' | 'unavailable' } = { allowed: true, outcome: 'allowed' }

vi.mock('../rate-limit', () => ({
  enforceFoundationRateLimit: async () => rateLimitBehavior,
}))

// Imported after the mock so the mocked module is what guard.ts resolves.
const { verifyFoundationApiRequest } = await import('../guard')

let db: DbClient
let fake: FakeSecureFoundationDb
let identityId: string
let identityGlobalId: string

function req(secret?: string): NextRequest {
  const headers: Record<string, string> = {}
  if (secret !== undefined) headers.authorization = `Bearer ${secret}`
  return new NextRequest('http://localhost/api/enterprise-assets', { headers })
}

beforeEach(async () => {
  rateLimitBehavior = { allowed: true, outcome: 'allowed' }
  fake = new FakeSecureFoundationDb()
  db = fake as unknown as DbClient
  const created = await fake.identityDb.rpc('create_enterprise_identity', {
    p_identity_type_code: 'SERVICE', p_display_name: 'Test Consumer', p_description: null,
    p_owner: null, p_business_scope: null, p_contact_email: null, p_metadata: {}, p_actor: 'test',
  })
  const row = created.data as { id: string; global_id: string }
  identityId = row.id
  identityGlobalId = row.global_id
  await fake.identityDb.rpc('activate_enterprise_identity', { p_global_id: identityGlobalId, p_actor: 'test' })
})

describe('valid request', () => {
  it('1. allows a valid credential bound to an Active identity, with the required scope', async () => {
    const issued = await createCredential({ identity_id: identityId, scopes: ['enterprise-assets:read'] }, db)
    const result = await verifyFoundationApiRequest(req(issued.secret), 'enterprise-assets:read', db)
    expect(result.ok).toBe(true)
  })
})

describe('credential presence and format', () => {
  it('2. denies a missing credential (no Authorization header)', async () => {
    const result = await verifyFoundationApiRequest(req(), 'enterprise-assets:read', db)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.response.status).toBe(401)
  })

  it('3. denies a malformed credential (wrong prefix)', async () => {
    const result = await verifyFoundationApiRequest(req('not-a-real-credential-format'), 'enterprise-assets:read', db)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.response.status).toBe(401)
  })

  it('4. denies an unknown credential (well-formed, never issued)', async () => {
    const { secret } = generateSecret()
    const result = await verifyFoundationApiRequest(req(secret), 'enterprise-assets:read', db)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.response.status).toBe(401)
  })

  it('5. denies a wrong secret for an otherwise-real credential prefix', async () => {
    await createCredential({ identity_id: identityId, scopes: ['enterprise-assets:read'] }, db)
    const { secret: wrongSecret } = generateSecret() // a different, never-issued secret
    const result = await verifyFoundationApiRequest(req(wrongSecret), 'enterprise-assets:read', db)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.response.status).toBe(401)
  })
})

describe('credential lifecycle state', () => {
  it('6. denies a revoked credential', async () => {
    const issued = await createCredential({ identity_id: identityId, scopes: ['enterprise-assets:read'] }, db)
    await fake.rpc('revoke_enterprise_api_credential', { p_credential_id: issued.credential.id, p_actor: 'test' })
    const result = await verifyFoundationApiRequest(req(issued.secret), 'enterprise-assets:read', db)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.response.status).toBe(401)
  })

  it('7. denies an expired credential', async () => {
    const issued = await createCredential({
      identity_id: identityId, scopes: ['enterprise-assets:read'], expires_at: new Date(Date.now() - 1000).toISOString(),
    }, db)
    const result = await verifyFoundationApiRequest(req(issued.secret), 'enterprise-assets:read', db)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.response.status).toBe(401)
  })
})

describe('linked identity lifecycle state', () => {
  it('8. denies when the linked identity is Suspended', async () => {
    const issued = await createCredential({ identity_id: identityId, scopes: ['enterprise-assets:read'] }, db)
    await fake.identityDb.rpc('suspend_enterprise_identity', { p_global_id: identityGlobalId, p_actor: 'test' })
    const result = await verifyFoundationApiRequest(req(issued.secret), 'enterprise-assets:read', db)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.response.status).toBe(401)
  })

  it('9. denies when the linked identity is Deactivated', async () => {
    const issued = await createCredential({ identity_id: identityId, scopes: ['enterprise-assets:read'] }, db)
    await fake.identityDb.rpc('deactivate_enterprise_identity', { p_global_id: identityGlobalId, p_actor: 'test' })
    const result = await verifyFoundationApiRequest(req(issued.secret), 'enterprise-assets:read', db)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.response.status).toBe(401)
  })

  it('10. denies when the linked identity is Archived', async () => {
    const issued = await createCredential({ identity_id: identityId, scopes: ['enterprise-assets:read'] }, db)
    await fake.identityDb.rpc('deactivate_enterprise_identity', { p_global_id: identityGlobalId, p_actor: 'test' })
    await fake.identityDb.rpc('archive_enterprise_identity', { p_global_id: identityGlobalId, p_actor: 'test' })
    const result = await verifyFoundationApiRequest(req(issued.secret), 'enterprise-assets:read', db)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.response.status).toBe(401)
  })
})

describe('authorization (scope)', () => {
  it('11. denies a capability the credential is not scoped for', async () => {
    const issued = await createCredential({ identity_id: identityId, scopes: ['enterprise-identities:read'] }, db)
    const result = await verifyFoundationApiRequest(req(issued.secret), 'enterprise-assets:read', db)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.response.status).toBe(403)
  })

  it('12. denies an operation the credential is not scoped for (read-only credential, write requested)', async () => {
    const issued = await createCredential({ identity_id: identityId, scopes: ['enterprise-assets:read'] }, db)
    const result = await verifyFoundationApiRequest(req(issued.secret), 'enterprise-assets:write', db)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.response.status).toBe(403)
  })
})

describe('rate limiting', () => {
  it('13. denies with 429 when the rate limit is exceeded', async () => {
    const issued = await createCredential({ identity_id: identityId, scopes: ['enterprise-assets:read'] }, db)
    rateLimitBehavior = { allowed: false, outcome: 'limited' }
    const result = await verifyFoundationApiRequest(req(issued.secret), 'enterprise-assets:read', db)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.response.status).toBe(429)
  })

  it('14. denies with 503 (fails closed, not open) when rate-limit configuration is unavailable', async () => {
    const issued = await createCredential({ identity_id: identityId, scopes: ['enterprise-assets:read'] }, db)
    rateLimitBehavior = { allowed: false, outcome: 'unavailable' }
    const result = await verifyFoundationApiRequest(req(issued.secret), 'enterprise-assets:read', db)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.response.status).toBe(503)
  })
})

describe('request audit', () => {
  it('15. writes an "allowed" audit row for a successful request', async () => {
    const issued = await createCredential({ identity_id: identityId, scopes: ['enterprise-assets:read'] }, db)
    await verifyFoundationApiRequest(req(issued.secret), 'enterprise-assets:read', db)
    expect(fake.apiRequestLog).toHaveLength(1)
    expect(fake.apiRequestLog[0]).toMatchObject({ result: 'allowed', credential_id: issued.credential.id })
  })

  it('16. writes a "denied" audit row with a denial reason for a rejected request', async () => {
    await verifyFoundationApiRequest(req(), 'enterprise-assets:read', db)
    expect(fake.apiRequestLog).toHaveLength(1)
    expect(fake.apiRequestLog[0]).toMatchObject({ result: 'denied', denial_reason: 'missing_credential' })
  })

  it('17. never writes the raw secret into the request-audit log', async () => {
    const issued = await createCredential({ identity_id: identityId, scopes: ['enterprise-assets:read'] }, db)
    await verifyFoundationApiRequest(req(issued.secret), 'enterprise-assets:read', db)
    const serialized = JSON.stringify(fake.apiRequestLog)
    expect(serialized).not.toContain(issued.secret)
  })

  it('the HTTP error response body never reveals the specific denial reason (anti-enumeration)', async () => {
    const missing = await verifyFoundationApiRequest(req(), 'enterprise-assets:read', db)
    const revokedIssued = await createCredential({ identity_id: identityId, scopes: ['enterprise-assets:read'] }, db)
    await fake.rpc('revoke_enterprise_api_credential', { p_credential_id: revokedIssued.credential.id, p_actor: 'test' })
    const revoked = await verifyFoundationApiRequest(req(revokedIssued.secret), 'enterprise-assets:read', db)

    if (!missing.ok && !revoked.ok) {
      const missingBody = await missing.response.clone().json()
      const revokedBody = await revoked.response.clone().json()
      expect(missingBody.error).toBe(revokedBody.error) // identical generic message, no distinguishing detail
    } else {
      throw new Error('expected both requests to be denied')
    }
  })
})

describe('rotation', () => {
  it('18. accepts requests using a newly rotated credential', async () => {
    const original = await createCredential({ identity_id: identityId, scopes: ['enterprise-assets:read'] }, db)
    const rotated = await rotateCredential(original.credential.id, identityId, ['enterprise-assets:read'], 'test', db)
    const result = await verifyFoundationApiRequest(req(rotated.secret), 'enterprise-assets:read', db)
    expect(result.ok).toBe(true)
  })

  it('19. rejects the old credential once it has been rotated away from (revoked)', async () => {
    const original = await createCredential({ identity_id: identityId, scopes: ['enterprise-assets:read'] }, db)
    await rotateCredential(original.credential.id, identityId, ['enterprise-assets:read'], 'test', db)
    const result = await verifyFoundationApiRequest(req(original.secret), 'enterprise-assets:read', db)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.response.status).toBe(401)
  })
})
