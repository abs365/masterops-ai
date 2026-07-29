// API-level tests: real route handlers, real NextRequest objects, only the
// Supabase boundary (createServiceClient) is swapped for the in-memory fake
// via vi.mock — mirrors EA-001's routes.test.ts exactly. Because EA-001's
// getAsset() also resolves createServiceClient() through this same mock,
// the fake's `assets` array doubles as the EA-001 read-only stand-in for
// link-asset tests below.
//
// EA-003's auth guard is stubbed here too, for the same isolation reason as
// EA-001's own routes.test.ts — see that file's header comment.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { FakeEnterpriseIdentityDb } from '@/lib/enterprise-identities/__tests__/fake-db-client'

let fake: FakeEnterpriseIdentityDb

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: async () => fake,
}))

vi.mock('@/lib/enterprise-api-security/guard', () => ({
  verifyFoundationApiRequest: async () => ({
    ok: true, credentialId: 'test-credential', identityId: 'test-identity', correlationId: 'test-correlation',
  }),
}))

beforeEach(() => {
  fake = new FakeEnterpriseIdentityDb()
})

async function createIdentityViaRoute(body: Record<string, unknown>) {
  const { POST } = await import('../route')
  const res = await POST(new NextRequest('http://localhost/api/enterprise-identities', {
    method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' },
  }))
  return { res, body: await res.json() }
}

describe('POST /api/enterprise-identities', () => {
  it('creates an identity and returns 201 with a permanent ID- global ID', async () => {
    const { res, body } = await createIdentityViaRoute({ identity_type_code: 'PERSON', display_name: 'Founder' })
    expect(res.status).toBe(201)
    expect(body.success).toBe(true)
    expect(body.data.global_id).toBe('ID-PERSON-000001')
    expect(body.data.lifecycle_state).toBe('provisioned')
  })

  it('returns 400 for an invalid payload', async () => {
    const { res } = await createIdentityViaRoute({})
    expect(res.status).toBe(400)
  })

  it('returns 400 for GROUP (deferred, not seeded) or an unknown identity_type_code', async () => {
    expect((await createIdentityViaRoute({ identity_type_code: 'GROUP', display_name: 'X' })).res.status).toBe(400)
    expect((await createIdentityViaRoute({ identity_type_code: 'NOT_A_TYPE', display_name: 'X' })).res.status).toBe(400)
  })
})

describe('GET /api/enterprise-identities', () => {
  it('lists created identities', async () => {
    await createIdentityViaRoute({ identity_type_code: 'PERSON', display_name: 'Founder' })

    const { GET } = await import('../route')
    const res = await GET(new NextRequest('http://localhost/api/enterprise-identities'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
  })

  it('returns 400 for an invalid query param', async () => {
    const { GET } = await import('../route')
    const res = await GET(new NextRequest('http://localhost/api/enterprise-identities?lifecycleState=not-a-state'))
    expect(res.status).toBe(400)
  })
})

describe('GET/PATCH /api/enterprise-identities/[globalId]', () => {
  it('gets a created identity by global ID', async () => {
    const { body: created } = await createIdentityViaRoute({ identity_type_code: 'PERSON', display_name: 'Founder' })

    const { GET } = await import('../[globalId]/route')
    const res = await GET(new NextRequest(`http://localhost/api/enterprise-identities/${created.data.global_id}`), {
      params: Promise.resolve({ globalId: created.data.global_id }),
    })
    expect(res.status).toBe(200)
    expect((await res.json()).data.global_id).toBe(created.data.global_id)
  })

  it('returns 404 for an unknown global ID', async () => {
    const { GET } = await import('../[globalId]/route')
    const res = await GET(new NextRequest('http://localhost/api/enterprise-identities/ID-PERSON-999999'), {
      params: Promise.resolve({ globalId: 'ID-PERSON-999999' }),
    })
    expect(res.status).toBe(404)
  })

  it('updates an identity via PATCH', async () => {
    const { body: created } = await createIdentityViaRoute({ identity_type_code: 'PERSON', display_name: 'Founder' })

    const { PATCH } = await import('../[globalId]/route')
    const res = await PATCH(
      new NextRequest(`http://localhost/api/enterprise-identities/${created.data.global_id}`, {
        method: 'PATCH', body: JSON.stringify({ owner: 'Founder' }), headers: { 'content-type': 'application/json' },
      }),
      { params: Promise.resolve({ globalId: created.data.global_id }) }
    )
    expect(res.status).toBe(200)
    expect((await res.json()).data.owner).toBe('Founder')
  })
})

describe('lifecycle transition routes', () => {
  it('walks activate -> suspend -> reactivate -> deactivate -> archive, each returning 200', async () => {
    const { body: created } = await createIdentityViaRoute({ identity_type_code: 'SERVICE', display_name: 'Bot' })
    const globalId = created.data.global_id
    const params = Promise.resolve({ globalId })

    const { POST: activate } = await import('../[globalId]/activate/route')
    const a = await activate(new NextRequest(`http://localhost/x/${globalId}/activate`, { method: 'POST' }), { params })
    expect(a.status).toBe(200)
    expect((await a.json()).data.lifecycle_state).toBe('active')

    const { POST: suspend } = await import('../[globalId]/suspend/route')
    const s = await suspend(new NextRequest(`http://localhost/x/${globalId}/suspend`, { method: 'POST' }), { params })
    expect((await s.json()).data.lifecycle_state).toBe('suspended')

    const { POST: reactivate } = await import('../[globalId]/reactivate/route')
    const r = await reactivate(new NextRequest(`http://localhost/x/${globalId}/reactivate`, { method: 'POST' }), { params })
    expect((await r.json()).data.lifecycle_state).toBe('active')

    const { POST: deactivate } = await import('../[globalId]/deactivate/route')
    const d = await deactivate(new NextRequest(`http://localhost/x/${globalId}/deactivate`, { method: 'POST' }), { params })
    expect((await d.json()).data.lifecycle_state).toBe('deactivated')

    const { POST: archive } = await import('../[globalId]/archive/route')
    const ar = await archive(new NextRequest(`http://localhost/x/${globalId}/archive`, { method: 'POST' }), { params })
    expect((await ar.json()).data.lifecycle_state).toBe('archived')
  })

  it('returns 409 for an invalid transition (archiving straight from Active)', async () => {
    const { body: created } = await createIdentityViaRoute({ identity_type_code: 'SERVICE', display_name: 'Bot' })
    const globalId = created.data.global_id
    const params = Promise.resolve({ globalId })

    const { POST: activate } = await import('../[globalId]/activate/route')
    await activate(new NextRequest(`http://localhost/x/${globalId}/activate`, { method: 'POST' }), { params })

    const { POST: archive } = await import('../[globalId]/archive/route')
    const res = await archive(new NextRequest(`http://localhost/x/${globalId}/archive`, { method: 'POST' }), { params })
    expect(res.status).toBe(409)
  })

  it('returns 404 for a transition on an unknown global ID', async () => {
    const { POST: activate } = await import('../[globalId]/activate/route')
    const res = await activate(
      new NextRequest('http://localhost/x/ID-PERSON-999999/activate', { method: 'POST' }),
      { params: Promise.resolve({ globalId: 'ID-PERSON-999999' }) }
    )
    expect(res.status).toBe(404)
  })
})

describe('POST/DELETE /api/enterprise-identities/[globalId]/link-asset', () => {
  it('links then unlinks an EA-001 asset by global ID', async () => {
    fake.assets.push({ id: 'asset-uuid-1', global_id: 'MO-AUTO-000001' })
    const { body: created } = await createIdentityViaRoute({ identity_type_code: 'SERVICE', display_name: 'Bot' })
    const globalId = created.data.global_id
    const params = Promise.resolve({ globalId })

    const { POST: link, DELETE: unlink } = await import('../[globalId]/link-asset/route')
    const linkRes = await link(
      new NextRequest(`http://localhost/x/${globalId}/link-asset`, {
        method: 'POST', body: JSON.stringify({ asset_global_id: 'MO-AUTO-000001' }), headers: { 'content-type': 'application/json' },
      }),
      { params }
    )
    expect(linkRes.status).toBe(200)
    expect((await linkRes.json()).data.asset_id).toBe('asset-uuid-1')

    const unlinkRes = await unlink(
      new NextRequest(`http://localhost/x/${globalId}/link-asset`, { method: 'DELETE' }),
      { params }
    )
    expect(unlinkRes.status).toBe(200)
    expect((await unlinkRes.json()).data.asset_id).toBeNull()
  })

  it('returns 400 when the target EA-001 asset does not exist', async () => {
    const { body: created } = await createIdentityViaRoute({ identity_type_code: 'SERVICE', display_name: 'Bot' })
    const globalId = created.data.global_id

    const { POST: link } = await import('../[globalId]/link-asset/route')
    const res = await link(
      new NextRequest(`http://localhost/x/${globalId}/link-asset`, {
        method: 'POST', body: JSON.stringify({ asset_global_id: 'MO-AUTO-999999' }), headers: { 'content-type': 'application/json' },
      }),
      { params: Promise.resolve({ globalId }) }
    )
    expect(res.status).toBe(400)
  })

  it('returns 400 for a malformed asset_global_id', async () => {
    const { body: created } = await createIdentityViaRoute({ identity_type_code: 'SERVICE', display_name: 'Bot' })
    const globalId = created.data.global_id

    const { POST: link } = await import('../[globalId]/link-asset/route')
    const res = await link(
      new NextRequest(`http://localhost/x/${globalId}/link-asset`, {
        method: 'POST', body: JSON.stringify({ asset_global_id: 'not-a-global-id' }), headers: { 'content-type': 'application/json' },
      }),
      { params: Promise.resolve({ globalId }) }
    )
    expect(res.status).toBe(400)
  })
})

describe('POST /api/enterprise-identities/validate', () => {
  it('reports valid: true without persisting anything', async () => {
    const { POST } = await import('../validate/route')
    const res = await POST(new NextRequest('http://localhost/api/enterprise-identities/validate', {
      method: 'POST', body: JSON.stringify({ identity_type_code: 'PERSON', display_name: 'Founder' }),
      headers: { 'content-type': 'application/json' },
    }))
    const body = await res.json()
    expect(body.valid).toBe(true)
    expect(fake.identities).toHaveLength(0)
  })

  it('reports valid: false with reasons for a bad payload', async () => {
    const { POST } = await import('../validate/route')
    const res = await POST(new NextRequest('http://localhost/api/enterprise-identities/validate', {
      method: 'POST', body: JSON.stringify({ identity_type_code: 'NOT_A_TYPE', display_name: 'X' }),
      headers: { 'content-type': 'application/json' },
    }))
    const body = await res.json()
    expect(body.valid).toBe(false)
    expect(body.errors.length).toBeGreaterThan(0)
  })
})

describe('GET /api/enterprise-identities/search', () => {
  it('finds identities by free-text query', async () => {
    await createIdentityViaRoute({ identity_type_code: 'SERVICE', display_name: 'Outreach Automation', description: 'Sends vendor emails' })

    const { GET } = await import('../search/route')
    const res = await GET(new NextRequest('http://localhost/api/enterprise-identities/search?q=Outreach'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
  })

  it('returns 400 when q is missing', async () => {
    const { GET } = await import('../search/route')
    const res = await GET(new NextRequest('http://localhost/api/enterprise-identities/search'))
    expect(res.status).toBe(400)
  })
})
