// End-to-end proof that the guard is actually wired into real EA-001/EA-002
// route handlers (not just correct in isolation, per guard.test.ts) — the
// literal "no regression to EA-001 and EA-002" requirement (test item 19),
// exercised against real route.ts files with a real, unmocked guard.
//
// Combines all three fakes (EA-001 assets, EA-002 identities via
// FakeSecureFoundationDb, EA-003 credentials) behind one createServiceClient
// mock, since a real deployment has all three in the same database.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { FakeEnterpriseAssetDb } from '@/lib/enterprise-assets/__tests__/fake-db-client'
import { FakeSecureFoundationDb } from './fake-db-client'
import { createCredential } from '../repository'

let assetDb: FakeEnterpriseAssetDb
let secureDb: FakeSecureFoundationDb

class CombinedDb {
  from(table: string) {
    if (table.startsWith('enterprise_asset')) return assetDb.from(table)
    return secureDb.from(table)
  }
  async rpc(fn: string, args: Record<string, unknown>) {
    if (fn.includes('_enterprise_asset') && !fn.includes('identity')) return assetDb.rpc(fn, args)
    return secureDb.rpc(fn, args)
  }
}

let combined: CombinedDb

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: async () => combined,
}))

// Rate limiting itself (fail-closed when Upstash is unconfigured, as it
// genuinely is in this test environment) has its own dedicated coverage in
// guard.test.ts items 13-14 — mocked out here so these tests isolate what
// they actually check: route wiring and scope enforcement.
vi.mock('../rate-limit', () => ({
  enforceFoundationRateLimit: async () => ({ allowed: true, outcome: 'allowed' }),
}))

beforeEach(async () => {
  assetDb = new FakeEnterpriseAssetDb()
  secureDb = new FakeSecureFoundationDb()
  combined = new CombinedDb()
})

async function issueCredential(scopes: string[]) {
  const created = await secureDb.identityDb.rpc('create_enterprise_identity', {
    p_identity_type_code: 'SERVICE', p_display_name: 'Integration Test Consumer', p_description: null,
    p_owner: null, p_business_scope: null, p_contact_email: null, p_metadata: {}, p_actor: 'test',
  })
  const identity = created.data as { id: string; global_id: string }
  await secureDb.identityDb.rpc('activate_enterprise_identity', { p_global_id: identity.global_id, p_actor: 'test' })
  return createCredential({ identity_id: identity.id, scopes: scopes as never }, combined as never)
}

describe('EA-001 route protection (POST /api/enterprise-assets)', () => {
  it('rejects a request with no credential', async () => {
    const { POST } = await import('@/app/api/enterprise-assets/route')
    const res = await POST(new NextRequest('http://localhost/api/enterprise-assets', {
      method: 'POST', body: JSON.stringify({ asset_type_code: 'PRODUCT', name: 'X' }), headers: { 'content-type': 'application/json' },
    }))
    expect(res.status).toBe(401)
    expect(assetDb.assets).toHaveLength(0)
  })

  it('rejects a credential scoped only for enterprise-identities', async () => {
    const issued = await issueCredential(['enterprise-identities:write'])
    const { POST } = await import('@/app/api/enterprise-assets/route')
    const res = await POST(new NextRequest('http://localhost/api/enterprise-assets', {
      method: 'POST', body: JSON.stringify({ asset_type_code: 'PRODUCT', name: 'X' }),
      headers: { 'content-type': 'application/json', authorization: `Bearer ${issued.secret}` },
    }))
    expect(res.status).toBe(403)
    expect(assetDb.assets).toHaveLength(0)
  })

  it('accepts a validly-scoped credential and performs the real EA-001 business operation correctly', async () => {
    const issued = await issueCredential(['enterprise-assets:write'])
    const { POST } = await import('@/app/api/enterprise-assets/route')
    const res = await POST(new NextRequest('http://localhost/api/enterprise-assets', {
      method: 'POST', body: JSON.stringify({ asset_type_code: 'PRODUCT', name: 'ELBOLD' }),
      headers: { 'content-type': 'application/json', authorization: `Bearer ${issued.secret}` },
    }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.global_id).toBe('MO-PROD-000001')
    expect(assetDb.assets).toHaveLength(1)
  })
})

describe('EA-002 route protection (POST /api/enterprise-identities)', () => {
  it('rejects a request with no credential', async () => {
    const { POST } = await import('@/app/api/enterprise-identities/route')
    const res = await POST(new NextRequest('http://localhost/api/enterprise-identities', {
      method: 'POST', body: JSON.stringify({ identity_type_code: 'PERSON', display_name: 'X' }), headers: { 'content-type': 'application/json' },
    }))
    expect(res.status).toBe(401)
  })

  it('rejects a credential scoped only for enterprise-assets', async () => {
    const issued = await issueCredential(['enterprise-assets:write'])
    const { POST } = await import('@/app/api/enterprise-identities/route')
    const res = await POST(new NextRequest('http://localhost/api/enterprise-identities', {
      method: 'POST', body: JSON.stringify({ identity_type_code: 'PERSON', display_name: 'X' }),
      headers: { 'content-type': 'application/json', authorization: `Bearer ${issued.secret}` },
    }))
    expect(res.status).toBe(403)
  })

  it('accepts a validly-scoped credential and performs the real EA-002 business operation correctly', async () => {
    const issued = await issueCredential(['enterprise-identities:write'])
    const { POST } = await import('@/app/api/enterprise-identities/route')
    const res = await POST(new NextRequest('http://localhost/api/enterprise-identities', {
      method: 'POST', body: JSON.stringify({ identity_type_code: 'PERSON', display_name: 'Founder' }),
      headers: { 'content-type': 'application/json', authorization: `Bearer ${issued.secret}` },
    }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.global_id).toMatch(/^ID-PERSON-\d{6}$/)
  })

  it('the credential used to create this very identity does not itself grant that identity any special access — a second, unrelated request with a suspended identity is still denied', async () => {
    // Sanity check that the guard's identity-status check is live end-to-end,
    // not just in the guard's own unit tests.
    const issued = await issueCredential(['enterprise-identities:read'])
    const credentialRow = secureDb.apiCredentials[0]
    const identityRow = secureDb.identityDb.identities.find((i) => i.id === credentialRow.identity_id)!
    await secureDb.identityDb.rpc('suspend_enterprise_identity', { p_global_id: identityRow.global_id, p_actor: 'test' })

    const { GET } = await import('@/app/api/enterprise-identities/route')
    const res = await GET(new NextRequest('http://localhost/api/enterprise-identities', {
      headers: { authorization: `Bearer ${issued.secret}` },
    }))
    expect(res.status).toBe(401)
  })
})
