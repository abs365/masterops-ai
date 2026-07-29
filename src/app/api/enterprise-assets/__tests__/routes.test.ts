// API-level tests: real route handlers, real NextRequest objects, only the
// Supabase boundary (createServiceClient) is swapped for the in-memory fake
// via vi.mock — everything else (parsing, validation, error → status mapping)
// runs exactly as it would in production.
//
// EA-003's auth guard is also stubbed here, deliberately: these tests exist
// to prove EA-001's own business logic, independent of the auth layer now
// sitting in front of it — the same isolation principle already applied to
// createServiceClient. Guard correctness itself (credential validation,
// scope enforcement, denial paths) has its own dedicated test suite in
// src/lib/enterprise-api-security/__tests__/, and the wiring between the two
// is proven separately by src/lib/enterprise-api-security/__tests__/route-integration.test.ts,
// which uses the REAL guard against these same route handlers.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { FakeEnterpriseAssetDb } from '@/lib/enterprise-assets/__tests__/fake-db-client'

let fake: FakeEnterpriseAssetDb

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: async () => fake,
}))

vi.mock('@/lib/enterprise-api-security/guard', () => ({
  verifyFoundationApiRequest: async () => ({
    ok: true, credentialId: 'test-credential', identityId: 'test-identity', correlationId: 'test-correlation',
  }),
}))

beforeEach(() => {
  fake = new FakeEnterpriseAssetDb()
})

describe('POST /api/enterprise-assets', () => {
  it('creates an asset and returns 201 with a permanent global ID', async () => {
    const { POST } = await import('../route')
    const req = new NextRequest('http://localhost/api/enterprise-assets', {
      method: 'POST',
      body: JSON.stringify({ asset_type_code: 'PRODUCT', name: 'ELBOLD' }),
      headers: { 'content-type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.global_id).toBe('MO-PROD-000001')
  })

  it('returns 400 for an invalid payload', async () => {
    const { POST } = await import('../route')
    const req = new NextRequest('http://localhost/api/enterprise-assets', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'content-type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 for an unknown asset_type_code', async () => {
    const { POST } = await import('../route')
    const req = new NextRequest('http://localhost/api/enterprise-assets', {
      method: 'POST',
      body: JSON.stringify({ asset_type_code: 'NOT_A_TYPE', name: 'X' }),
      headers: { 'content-type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})

describe('GET /api/enterprise-assets', () => {
  it('lists created assets', async () => {
    const { POST } = await import('../route')
    await POST(new NextRequest('http://localhost/api/enterprise-assets', {
      method: 'POST', body: JSON.stringify({ asset_type_code: 'PRODUCT', name: 'ELBOLD' }),
      headers: { 'content-type': 'application/json' },
    }))

    const { GET } = await import('../route')
    const res = await GET(new NextRequest('http://localhost/api/enterprise-assets'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
  })

  it('returns 400 for an invalid query param', async () => {
    const { GET } = await import('../route')
    const res = await GET(new NextRequest('http://localhost/api/enterprise-assets?status=deleted'))
    expect(res.status).toBe(400)
  })
})

describe('GET/PATCH /api/enterprise-assets/[globalId]', () => {
  it('gets a created asset by global ID', async () => {
    const { POST } = await import('../route')
    const createRes = await POST(new NextRequest('http://localhost/api/enterprise-assets', {
      method: 'POST', body: JSON.stringify({ asset_type_code: 'PRODUCT', name: 'ELBOLD' }),
      headers: { 'content-type': 'application/json' },
    }))
    const { data: created } = await createRes.json()

    const { GET } = await import('../[globalId]/route')
    const res = await GET(new NextRequest(`http://localhost/api/enterprise-assets/${created.global_id}`), {
      params: Promise.resolve({ globalId: created.global_id }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.global_id).toBe(created.global_id)
  })

  it('returns 404 for an unknown global ID', async () => {
    const { GET } = await import('../[globalId]/route')
    const res = await GET(new NextRequest('http://localhost/api/enterprise-assets/MO-PROD-999999'), {
      params: Promise.resolve({ globalId: 'MO-PROD-999999' }),
    })
    expect(res.status).toBe(404)
  })

  it('updates an asset via PATCH', async () => {
    const { POST } = await import('../route')
    const createRes = await POST(new NextRequest('http://localhost/api/enterprise-assets', {
      method: 'POST', body: JSON.stringify({ asset_type_code: 'PRODUCT', name: 'ELBOLD' }),
      headers: { 'content-type': 'application/json' },
    }))
    const { data: created } = await createRes.json()

    const { PATCH } = await import('../[globalId]/route')
    const res = await PATCH(
      new NextRequest(`http://localhost/api/enterprise-assets/${created.global_id}`, {
        method: 'PATCH', body: JSON.stringify({ owner: 'Founder' }), headers: { 'content-type': 'application/json' },
      }),
      { params: Promise.resolve({ globalId: created.global_id }) }
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.owner).toBe('Founder')
  })
})

describe('POST /api/enterprise-assets/[globalId]/archive and /restore', () => {
  it('archives then restores an asset', async () => {
    const { POST: createAssetRoute } = await import('../route')
    const createRes = await createAssetRoute(new NextRequest('http://localhost/api/enterprise-assets', {
      method: 'POST', body: JSON.stringify({ asset_type_code: 'PRODUCT', name: 'ELBOLD' }),
      headers: { 'content-type': 'application/json' },
    }))
    const { data: created } = await createRes.json()

    const { POST: archiveRoute } = await import('../[globalId]/archive/route')
    const archiveRes = await archiveRoute(
      new NextRequest(`http://localhost/api/enterprise-assets/${created.global_id}/archive`, { method: 'POST' }),
      { params: Promise.resolve({ globalId: created.global_id }) }
    )
    expect(archiveRes.status).toBe(200)
    expect((await archiveRes.json()).data.status).toBe('archived')

    const { POST: restoreRoute } = await import('../[globalId]/restore/route')
    const restoreRes = await restoreRoute(
      new NextRequest(`http://localhost/api/enterprise-assets/${created.global_id}/restore`, { method: 'POST' }),
      { params: Promise.resolve({ globalId: created.global_id }) }
    )
    expect(restoreRes.status).toBe(200)
    expect((await restoreRes.json()).data.status).toBe('active')
  })
})

describe('POST /api/enterprise-assets/[globalId]/relationships', () => {
  it('creates a relationship using the URL asset as source', async () => {
    const { POST: createAssetRoute } = await import('../route')
    const a = await (await createAssetRoute(new NextRequest('http://localhost/api/enterprise-assets', {
      method: 'POST', body: JSON.stringify({ asset_type_code: 'PRODUCT', name: 'A' }),
      headers: { 'content-type': 'application/json' },
    }))).json()
    const b = await (await createAssetRoute(new NextRequest('http://localhost/api/enterprise-assets', {
      method: 'POST', body: JSON.stringify({ asset_type_code: 'SHARED_SERVICE', name: 'B' }),
      headers: { 'content-type': 'application/json' },
    }))).json()

    const { POST: relRoute, GET: relListRoute } = await import('../[globalId]/relationships/route')
    const createRelRes = await relRoute(
      new NextRequest(`http://localhost/api/enterprise-assets/${a.data.global_id}/relationships`, {
        method: 'POST', body: JSON.stringify({ target_global_id: b.data.global_id, relationship_type: 'depends_on' }),
        headers: { 'content-type': 'application/json' },
      }),
      { params: Promise.resolve({ globalId: a.data.global_id }) }
    )
    expect(createRelRes.status).toBe(201)

    const listRes = await relListRoute(
      new NextRequest(`http://localhost/api/enterprise-assets/${a.data.global_id}/relationships`),
      { params: Promise.resolve({ globalId: a.data.global_id }) }
    )
    const listBody = await listRes.json()
    expect(listBody.data).toHaveLength(1)
  })
})

describe('POST /api/enterprise-assets/validate', () => {
  it('reports valid: true without persisting anything', async () => {
    const { POST } = await import('../validate/route')
    const res = await POST(new NextRequest('http://localhost/api/enterprise-assets/validate', {
      method: 'POST', body: JSON.stringify({ asset_type_code: 'PRODUCT', name: 'ELBOLD' }),
      headers: { 'content-type': 'application/json' },
    }))
    const body = await res.json()
    expect(body.valid).toBe(true)
    expect(fake.assets).toHaveLength(0)
  })

  it('reports valid: false with reasons for a bad payload', async () => {
    const { POST } = await import('../validate/route')
    const res = await POST(new NextRequest('http://localhost/api/enterprise-assets/validate', {
      method: 'POST', body: JSON.stringify({ asset_type_code: 'NOT_A_TYPE', name: 'X' }),
      headers: { 'content-type': 'application/json' },
    }))
    const body = await res.json()
    expect(body.valid).toBe(false)
    expect(body.errors.length).toBeGreaterThan(0)
  })
})

describe('GET /api/enterprise-assets/search', () => {
  it('finds assets by free-text query', async () => {
    const { POST: createAssetRoute } = await import('../route')
    await createAssetRoute(new NextRequest('http://localhost/api/enterprise-assets', {
      method: 'POST', body: JSON.stringify({ asset_type_code: 'PRODUCT', name: 'ELBOLD', description: 'Event marketplace' }),
      headers: { 'content-type': 'application/json' },
    }))

    const { GET } = await import('../search/route')
    const res = await GET(new NextRequest('http://localhost/api/enterprise-assets/search?q=marketplace'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
  })

  it('returns 400 when q is missing', async () => {
    const { GET } = await import('../search/route')
    const res = await GET(new NextRequest('http://localhost/api/enterprise-assets/search'))
    expect(res.status).toBe(400)
  })
})
