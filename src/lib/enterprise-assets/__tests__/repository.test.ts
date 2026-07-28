import { describe, it, expect, beforeEach } from 'vitest'
import { FakeEnterpriseAssetDb } from './fake-db-client'
import {
  createAsset, getAsset, updateAsset, archiveAsset, restoreAsset,
  createRelationship, listRelationships, listAssets, searchAssets,
  assetTypeExists, getAssetTypes, AssetNotFoundError, UnknownAssetTypeError,
} from '../repository'
import type { DbClient } from '../repository'

let db: DbClient
let fake: FakeEnterpriseAssetDb

beforeEach(() => {
  fake = new FakeEnterpriseAssetDb()
  db = fake as unknown as DbClient
})

describe('asset types', () => {
  it('lists the 9 seeded asset types', async () => {
    const types = await getAssetTypes(db)
    expect(types).toHaveLength(9)
    expect(types.map((t) => t.code)).toContain('PRODUCT')
  })

  it('confirms a known type exists and an unknown one does not', async () => {
    expect(await assetTypeExists('PRODUCT', db)).toBe(true)
    expect(await assetTypeExists('NOT_A_TYPE', db)).toBe(false)
  })
})

describe('createAsset', () => {
  it('generates a permanent, correctly formatted global ID', async () => {
    const asset = await createAsset({ asset_type_code: 'PRODUCT', name: 'ELBOLD' }, db)
    expect(asset.global_id).toBe('MO-PROD-000001')
    expect(asset.status).toBe('active')
    expect(asset.lifecycle_stage).toBe('concept')
  })

  it('increments the counter per prefix, independently per type', async () => {
    const a = await createAsset({ asset_type_code: 'PRODUCT', name: 'A' }, db)
    const b = await createAsset({ asset_type_code: 'PRODUCT', name: 'B' }, db)
    const c = await createAsset({ asset_type_code: 'SHARED_SERVICE', name: 'C' }, db)
    expect(a.global_id).toBe('MO-PROD-000001')
    expect(b.global_id).toBe('MO-PROD-000002')
    expect(c.global_id).toBe('MO-SVC-000001')
  })

  it('rejects an unknown asset type', async () => {
    await expect(createAsset({ asset_type_code: 'NOT_A_TYPE', name: 'X' }, db)).rejects.toBeInstanceOf(UnknownAssetTypeError)
  })

  it('writes an AssetCreated audit record and event', async () => {
    const asset = await createAsset({ asset_type_code: 'PRODUCT', name: 'ELBOLD', actor: 'founder' }, db)
    expect(fake.auditLog).toHaveLength(1)
    expect(fake.auditLog[0]).toMatchObject({ action: 'AssetCreated', actor: 'founder', asset_id: asset.id, before: null })
    expect(fake.events).toHaveLength(1)
    expect(fake.events[0]).toMatchObject({ event_type: 'AssetCreated', asset_id: asset.id })
  })
})

describe('getAsset', () => {
  it('returns null for an unknown global ID', async () => {
    expect(await getAsset('MO-PROD-999999', db)).toBeNull()
  })

  it('returns the asset for a known global ID', async () => {
    const created = await createAsset({ asset_type_code: 'PRODUCT', name: 'ELBOLD' }, db)
    const fetched = await getAsset(created.global_id, db)
    expect(fetched).toMatchObject({ global_id: created.global_id, name: 'ELBOLD' })
  })
})

describe('updateAsset', () => {
  it('applies a partial patch without clobbering untouched fields', async () => {
    const created = await createAsset({ asset_type_code: 'PRODUCT', name: 'ELBOLD', owner: 'Founder' }, db)
    const updated = await updateAsset(created.global_id, { description: 'Event marketplace' }, db)
    expect(updated.description).toBe('Event marketplace')
    expect(updated.owner).toBe('Founder')
    expect(updated.name).toBe('ELBOLD')
  })

  it('throws AssetNotFoundError for an unknown asset', async () => {
    await expect(updateAsset('MO-PROD-999999', { name: 'X' }, db)).rejects.toBeInstanceOf(AssetNotFoundError)
  })

  it('refuses to update an archived asset', async () => {
    const created = await createAsset({ asset_type_code: 'PRODUCT', name: 'ELBOLD' }, db)
    await archiveAsset(created.global_id, 'founder', db)
    await expect(updateAsset(created.global_id, { name: 'New name' }, db)).rejects.toThrow(/archived/)
  })

  it('emits an additional LifecycleChanged audit + event only when lifecycle_stage actually changes', async () => {
    const created = await createAsset({ asset_type_code: 'PRODUCT', name: 'ELBOLD' }, db)
    fake.auditLog.length = 0
    fake.events.length = 0

    await updateAsset(created.global_id, { owner: 'Founder' }, db)
    expect(fake.auditLog.map((r) => r.action)).toEqual(['AssetUpdated'])
    expect(fake.events.map((e) => e.event_type)).toEqual(['AssetUpdated'])

    await updateAsset(created.global_id, { lifecycle_stage: 'live' }, db)
    expect(fake.auditLog.map((r) => r.action)).toEqual(['AssetUpdated', 'AssetUpdated', 'LifecycleChanged'])
    expect(fake.events.map((e) => e.event_type)).toEqual(['AssetUpdated', 'AssetUpdated', 'LifecycleChanged'])
  })
})

describe('archiveAsset / restoreAsset', () => {
  it('archives an asset (soft delete) and records before/after', async () => {
    const created = await createAsset({ asset_type_code: 'PRODUCT', name: 'ELBOLD' }, db)
    const archived = await archiveAsset(created.global_id, 'founder', db)
    expect(archived.status).toBe('archived')
    expect(archived.archived_at).not.toBeNull()

    const auditEntry = fake.auditLog.find((r) => r.action === 'AssetArchived')
    expect(auditEntry).toBeDefined()
  })

  it('is idempotent when archiving an already-archived asset', async () => {
    const created = await createAsset({ asset_type_code: 'PRODUCT', name: 'ELBOLD' }, db)
    await archiveAsset(created.global_id, 'founder', db)
    const auditCountAfterFirst = fake.auditLog.length
    await archiveAsset(created.global_id, 'founder', db)
    expect(fake.auditLog.length).toBe(auditCountAfterFirst)
  })

  it('restores an archived asset back to active', async () => {
    const created = await createAsset({ asset_type_code: 'PRODUCT', name: 'ELBOLD' }, db)
    await archiveAsset(created.global_id, 'founder', db)
    const restored = await restoreAsset(created.global_id, 'founder', db)
    expect(restored.status).toBe('active')
    expect(restored.archived_at).toBeNull()
  })

  it('archive/restore throw AssetNotFoundError for an unknown asset', async () => {
    await expect(archiveAsset('MO-PROD-999999', 'founder', db)).rejects.toBeInstanceOf(AssetNotFoundError)
    await expect(restoreAsset('MO-PROD-999999', 'founder', db)).rejects.toBeInstanceOf(AssetNotFoundError)
  })
})

describe('relationships', () => {
  it('creates a relationship between two known assets', async () => {
    const a = await createAsset({ asset_type_code: 'PRODUCT', name: 'ELBOLD' }, db)
    const b = await createAsset({ asset_type_code: 'SHARED_SERVICE', name: 'Notifications' }, db)

    const rel = await createRelationship(
      { source_global_id: a.global_id, target_global_id: b.global_id, relationship_type: 'depends_on' }, db
    )
    expect(rel.relationship_type).toBe('depends_on')

    const list = await listRelationships(a.global_id, db)
    expect(list).toHaveLength(1)
  })

  it('lists relationships regardless of which side the asset is on', async () => {
    const a = await createAsset({ asset_type_code: 'PRODUCT', name: 'A' }, db)
    const b = await createAsset({ asset_type_code: 'PRODUCT', name: 'B' }, db)
    await createRelationship({ source_global_id: a.global_id, target_global_id: b.global_id, relationship_type: 'related_to' }, db)

    expect(await listRelationships(a.global_id, db)).toHaveLength(1)
    expect(await listRelationships(b.global_id, db)).toHaveLength(1)
  })

  it('rejects a relationship to an unknown target', async () => {
    const a = await createAsset({ asset_type_code: 'PRODUCT', name: 'A' }, db)
    await expect(
      createRelationship({ source_global_id: a.global_id, target_global_id: 'MO-PROD-999999', relationship_type: 'uses' }, db)
    ).rejects.toBeInstanceOf(AssetNotFoundError)
  })

  it('error message correctly names the target, not the source, when the target is the one missing', async () => {
    const a = await createAsset({ asset_type_code: 'PRODUCT', name: 'A' }, db)
    await expect(
      createRelationship({ source_global_id: a.global_id, target_global_id: 'MO-PROD-999999', relationship_type: 'uses' }, db)
    ).rejects.toThrow(/Target asset not found: MO-PROD-999999/)
  })

  it('error message correctly names the source when the source is missing', async () => {
    const b = await createAsset({ asset_type_code: 'PRODUCT', name: 'B' }, db)
    await expect(
      createRelationship({ source_global_id: 'MO-PROD-999999', target_global_id: b.global_id, relationship_type: 'uses' }, db)
    ).rejects.toThrow(/Source asset not found: MO-PROD-999999/)
  })

  it('re-creating the same (source, target, type) triple upserts metadata without duplicating the audit/event trail', async () => {
    const a = await createAsset({ asset_type_code: 'PRODUCT', name: 'A' }, db)
    const b = await createAsset({ asset_type_code: 'PRODUCT', name: 'B' }, db)

    await createRelationship(
      { source_global_id: a.global_id, target_global_id: b.global_id, relationship_type: 'depends_on', metadata: { v: 1 } }, db
    )
    const relationshipAuditCount = fake.auditLog.filter((r) => r.action === 'RelationshipCreated').length
    const relationshipEventCount = fake.events.filter((e) => e.event_type === 'RelationshipCreated').length

    const second = await createRelationship(
      { source_global_id: a.global_id, target_global_id: b.global_id, relationship_type: 'depends_on', metadata: { v: 2 } }, db
    )

    expect(second.metadata).toEqual({ v: 2 })
    expect(fake.relationships).toHaveLength(1)
    expect(fake.auditLog.filter((r) => r.action === 'RelationshipCreated')).toHaveLength(relationshipAuditCount)
    expect(fake.events.filter((e) => e.event_type === 'RelationshipCreated')).toHaveLength(relationshipEventCount)
  })
})

describe('listAssets', () => {
  beforeEach(async () => {
    await createAsset({ asset_type_code: 'PRODUCT', name: 'ELBOLD', business_domain: 'events' }, db)
    await createAsset({ asset_type_code: 'PRODUCT', name: 'MeritBold', business_domain: 'leadgen' }, db)
    const angel = await createAsset({ asset_type_code: 'PRODUCT', name: 'Angel 11Plus', business_domain: 'education' }, db)
    await archiveAsset(angel.global_id, 'founder', db)
  })

  it('excludes archived assets by default', async () => {
    const result = await listAssets({}, db)
    expect(result.total).toBe(2)
    expect(result.data.map((a) => a.name)).not.toContain('Angel 11Plus')
  })

  it('includes archived assets when requested', async () => {
    const result = await listAssets({ includeArchived: true }, db)
    expect(result.total).toBe(3)
  })

  it('filters by business_domain', async () => {
    const result = await listAssets({ businessDomain: 'events' }, db)
    expect(result.total).toBe(1)
    expect(result.data[0].name).toBe('ELBOLD')
  })

  it('paginates', async () => {
    const page1 = await listAssets({ page: 1, pageSize: 1, sortBy: 'name', sortDir: 'asc' }, db)
    expect(page1.data).toHaveLength(1)
    expect(page1.total).toBe(2)
  })
})

describe('searchAssets', () => {
  it('finds an asset by free-text match on name', async () => {
    await createAsset({ asset_type_code: 'PRODUCT', name: 'ELBOLD', description: 'Event marketplace' }, db)
    await createAsset({ asset_type_code: 'PRODUCT', name: 'MeritBold', description: 'Lead generation' }, db)

    const result = await searchAssets({ q: 'marketplace' }, db)
    expect(result.data).toHaveLength(1)
    expect(result.data[0].name).toBe('ELBOLD')
  })
})
