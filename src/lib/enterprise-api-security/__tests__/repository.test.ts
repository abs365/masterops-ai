import { describe, it, expect, beforeEach } from 'vitest'
import { FakeSecureFoundationDb } from './fake-db-client'
import {
  createCredential, revokeCredential, rotateCredential, touchLastUsed,
  findActiveCredentialBySecret, resolveIdentityStatus, logRequest, listRequestLog,
  redactCredential,
} from '../repository'
import type { DbClient } from '../repository'

let db: DbClient
let fake: FakeSecureFoundationDb
let identityId: string

beforeEach(async () => {
  fake = new FakeSecureFoundationDb()
  db = fake as unknown as DbClient
  const identity = await fake.identityDb.rpc('create_enterprise_identity', {
    p_identity_type_code: 'SERVICE', p_display_name: 'Test Consumer', p_description: null,
    p_owner: null, p_business_scope: null, p_contact_email: null, p_metadata: {}, p_actor: 'test',
  })
  identityId = (identity.data as { id: string }).id
})

describe('createCredential', () => {
  it('returns a redacted credential and the raw secret, exactly once', async () => {
    const issued = await createCredential({ identity_id: identityId, scopes: ['enterprise-assets:read'] }, db)
    expect(issued.secret).toMatch(/^moak_/)
    expect(issued.credential).not.toHaveProperty('secret_hash')
    expect(issued.credential.status).toBe('active')
  })

  it('rejects an unknown identity', async () => {
    await expect(createCredential({ identity_id: 'not-a-real-id', scopes: ['enterprise-assets:read'] }, db)).rejects.toThrow(/not found/)
  })

  it('writes a CredentialCreated audit record', async () => {
    await createCredential({ identity_id: identityId, scopes: ['enterprise-assets:read'] }, db)
    expect(fake.apiCredentialAuditLog).toHaveLength(1)
    expect(fake.apiCredentialAuditLog[0]).toMatchObject({ action: 'CredentialCreated' })
  })

  it('never writes the raw secret into the audit log', async () => {
    const issued = await createCredential({ identity_id: identityId, scopes: ['enterprise-assets:read'] }, db)
    const serialized = JSON.stringify(fake.apiCredentialAuditLog)
    expect(serialized).not.toContain(issued.secret)
  })
})

describe('findActiveCredentialBySecret', () => {
  it('finds a credential by its raw secret', async () => {
    const issued = await createCredential({ identity_id: identityId, scopes: ['enterprise-assets:read'] }, db)
    const result = await findActiveCredentialBySecret(issued.secret, db)
    expect(result.credential).not.toBeNull()
    expect(result.credential?.id).toBe(issued.credential.id)
    expect(result.isExpired).toBe(false)
  })

  it('returns null for an unknown secret', async () => {
    const result = await findActiveCredentialBySecret('moak_never_issued_00000000000000000000', db)
    expect(result.credential).toBeNull()
  })

  it('flags an expired credential via isExpired, independent of its stored status', async () => {
    const issued = await createCredential({
      identity_id: identityId, scopes: ['enterprise-assets:read'], expires_at: new Date(Date.now() - 1000).toISOString(),
    }, db)
    const result = await findActiveCredentialBySecret(issued.secret, db)
    expect(result.credential?.status).toBe('active') // stored status untouched — real-time check, not a background job
    expect(result.isExpired).toBe(true)
  })
})

describe('revokeCredential / rotateCredential', () => {
  it('revokes a credential and it can no longer be found as active-lookup-worthy without an explicit status check by the caller', async () => {
    const issued = await createCredential({ identity_id: identityId, scopes: ['enterprise-assets:read'] }, db)
    const revoked = await revokeCredential(issued.credential.id, 'test', db)
    expect(revoked.status).toBe('revoked')
  })

  it('is idempotent — revoking twice does not error or duplicate the audit row', async () => {
    const issued = await createCredential({ identity_id: identityId, scopes: ['enterprise-assets:read'] }, db)
    await revokeCredential(issued.credential.id, 'test', db)
    const auditCountBefore = fake.apiCredentialAuditLog.length
    await revokeCredential(issued.credential.id, 'test', db)
    expect(fake.apiCredentialAuditLog).toHaveLength(auditCountBefore)
  })

  it('rotation issues a new credential and revokes the old one, leaving both rows in place (never mutates in place)', async () => {
    const original = await createCredential({ identity_id: identityId, scopes: ['enterprise-assets:read'] }, db)
    const rotated = await rotateCredential(original.credential.id, identityId, ['enterprise-assets:read'], 'test', db)

    expect(rotated.secret).not.toBe(original.secret)
    expect(fake.apiCredentials).toHaveLength(2)

    const oldLookup = await findActiveCredentialBySecret(original.secret, db)
    expect(oldLookup.credential?.status).toBe('revoked')

    const newLookup = await findActiveCredentialBySecret(rotated.secret, db)
    expect(newLookup.credential?.status).toBe('active')
  })
})

describe('resolveIdentityStatus', () => {
  it('reports active for an activated identity', async () => {
    await fake.identityDb.rpc('activate_enterprise_identity', { p_global_id: (await getIdentityGlobalId()), p_actor: 'test' })
    const status = await resolveIdentityStatus(identityId, db)
    expect(status.active).toBe(true)
    expect(status.lifecycleState).toBe('active')

    async function getIdentityGlobalId() {
      return fake.identityDb.identities.find((i) => i.id === identityId)!.global_id
    }
  })

  it('reports not-active for a provisioned (never activated) identity', async () => {
    const status = await resolveIdentityStatus(identityId, db)
    expect(status.active).toBe(false)
    expect(status.lifecycleState).toBe('provisioned')
  })

  it('reports not-found for an unknown identity id', async () => {
    const status = await resolveIdentityStatus('not-a-real-id', db)
    expect(status.active).toBe(false)
    expect(status.lifecycleState).toBeNull()
  })
})

describe('request log', () => {
  it('writes and lists request log entries', async () => {
    await logRequest({
      correlationId: 'c1', credentialId: null, identityId: null, capability: 'enterprise-assets', operation: 'read',
      method: 'GET', path: '/api/enterprise-assets', result: 'denied', denialReason: 'missing_credential',
      statusCode: 401, rateLimitOutcome: 'not_applicable', latencyMs: 5,
    }, db)
    const rows = await listRequestLog({}, db)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ result: 'denied', denial_reason: 'missing_credential' })
  })

  it('filters by result', async () => {
    await logRequest({
      correlationId: 'c1', credentialId: null, identityId: null, capability: null, operation: null,
      method: 'GET', path: '/x', result: 'allowed', denialReason: null, statusCode: 200, rateLimitOutcome: 'allowed', latencyMs: 1,
    }, db)
    await logRequest({
      correlationId: 'c2', credentialId: null, identityId: null, capability: null, operation: null,
      method: 'GET', path: '/x', result: 'denied', denialReason: 'unknown_credential', statusCode: 401, rateLimitOutcome: 'allowed', latencyMs: 1,
    }, db)
    const denied = await listRequestLog({ result: 'denied' }, db)
    expect(denied).toHaveLength(1)
    expect(denied[0].result).toBe('denied')
  })
})

describe('touchLastUsed', () => {
  it('sets last_used_at on the credential', async () => {
    const issued = await createCredential({ identity_id: identityId, scopes: ['enterprise-assets:read'] }, db)
    expect(fake.apiCredentials[0].last_used_at).toBeNull()
    await touchLastUsed(issued.credential.id, db)
    expect(fake.apiCredentials[0].last_used_at).not.toBeNull()
  })
})

describe('redactCredential', () => {
  it('never includes secret_hash in its output', () => {
    const redacted = redactCredential({
      id: 'x', identity_id: 'y', credential_prefix: 'moak_abc', secret_hash: 'super-secret-hash',
      scopes: ['enterprise-assets:read'], status: 'active', expires_at: null, created_at: 'now',
      revoked_at: null, last_used_at: null, created_by: 'system',
    })
    expect(redacted).not.toHaveProperty('secret_hash')
    expect(JSON.stringify(redacted)).not.toContain('super-secret-hash')
  })
})
