import { describe, it, expect, beforeEach } from 'vitest'
import { FakeEnterpriseIdentityDb } from './fake-db-client'
import {
  createIdentity, getIdentity, updateIdentity,
  activateIdentity, suspendIdentity, reactivateIdentity, deactivateIdentity, archiveIdentity,
  linkIdentityAsset, unlinkIdentityAsset,
  listIdentities, searchIdentities, identityTypeExists, getIdentityTypes,
  IdentityNotFoundError, UnknownIdentityTypeError, InvalidLifecycleTransitionError,
} from '../repository'
import type { DbClient } from '../repository'

let db: DbClient
let fake: FakeEnterpriseIdentityDb

beforeEach(() => {
  fake = new FakeEnterpriseIdentityDb()
  db = fake as unknown as DbClient
})

describe('identity types', () => {
  it('lists the 3 seeded identity types (GROUP deliberately not seeded)', async () => {
    const types = await getIdentityTypes(db)
    expect(types).toHaveLength(3)
    expect(types.map((t) => t.code)).toEqual(['EXTERNAL', 'PERSON', 'SERVICE'])
  })

  it('confirms a known type exists and an unknown one (including GROUP) does not', async () => {
    expect(await identityTypeExists('PERSON', db)).toBe(true)
    expect(await identityTypeExists('GROUP', db)).toBe(false)
    expect(await identityTypeExists('NOT_A_TYPE', db)).toBe(false)
  })
})

describe('createIdentity', () => {
  it('generates a permanent, correctly formatted ID- global ID', async () => {
    const identity = await createIdentity({ identity_type_code: 'PERSON', display_name: 'Founder' }, db)
    expect(identity.global_id).toBe('ID-PERSON-000001')
    expect(identity.lifecycle_state).toBe('provisioned')
  })

  it('increments the counter per prefix, independently per type', async () => {
    const a = await createIdentity({ identity_type_code: 'SERVICE', display_name: 'Outreach Automation' }, db)
    const b = await createIdentity({ identity_type_code: 'SERVICE', display_name: 'Growth Cycle' }, db)
    const c = await createIdentity({ identity_type_code: 'PERSON', display_name: 'Founder' }, db)
    expect(a.global_id).toBe('ID-SERVICE-000001')
    expect(b.global_id).toBe('ID-SERVICE-000002')
    expect(c.global_id).toBe('ID-PERSON-000001')
  })

  it('rejects an unknown or deferred (GROUP) identity type', async () => {
    await expect(createIdentity({ identity_type_code: 'GROUP', display_name: 'X' }, db)).rejects.toBeInstanceOf(UnknownIdentityTypeError)
    await expect(createIdentity({ identity_type_code: 'NOT_A_TYPE', display_name: 'X' }, db)).rejects.toBeInstanceOf(UnknownIdentityTypeError)
  })

  it('writes an IdentityCreated audit record and event', async () => {
    const identity = await createIdentity({ identity_type_code: 'PERSON', display_name: 'Founder', actor: 'founder' }, db)
    expect(fake.auditLog).toHaveLength(1)
    expect(fake.auditLog[0]).toMatchObject({ action: 'IdentityCreated', actor: 'founder', identity_id: identity.id, before: null })
    expect(fake.events).toHaveLength(1)
    expect(fake.events[0]).toMatchObject({ event_type: 'IdentityCreated', identity_id: identity.id })
  })
})

describe('getIdentity', () => {
  it('returns null for an unknown global ID', async () => {
    expect(await getIdentity('ID-PERSON-999999', db)).toBeNull()
  })

  it('returns the identity for a known global ID', async () => {
    const created = await createIdentity({ identity_type_code: 'PERSON', display_name: 'Founder' }, db)
    const fetched = await getIdentity(created.global_id, db)
    expect(fetched).toMatchObject({ global_id: created.global_id, display_name: 'Founder' })
  })
})

describe('updateIdentity', () => {
  it('applies a partial patch without clobbering untouched fields', async () => {
    const created = await createIdentity({ identity_type_code: 'PERSON', display_name: 'Founder', owner: 'Founder' }, db)
    const updated = await updateIdentity(created.global_id, { description: 'Enterprise operator' }, db)
    expect(updated.description).toBe('Enterprise operator')
    expect(updated.owner).toBe('Founder')
    expect(updated.display_name).toBe('Founder')
  })

  it('throws IdentityNotFoundError for an unknown global ID', async () => {
    await expect(updateIdentity('ID-PERSON-999999', { description: 'x' }, db)).rejects.toBeInstanceOf(IdentityNotFoundError)
  })

  it('rejects updating an archived identity (archived is terminal, no restore path)', async () => {
    const created = await createIdentity({ identity_type_code: 'SERVICE', display_name: 'Bot' }, db)
    await activateIdentity(created.global_id, undefined, db)
    await deactivateIdentity(created.global_id, undefined, db)
    await archiveIdentity(created.global_id, undefined, db)
    await expect(updateIdentity(created.global_id, { description: 'x' }, db)).rejects.toBeInstanceOf(InvalidLifecycleTransitionError)
  })
})

describe('lifecycle transitions', () => {
  it('walks the full happy path: provisioned -> active -> suspended -> active -> deactivated -> archived', async () => {
    const created = await createIdentity({ identity_type_code: 'SERVICE', display_name: 'Bot' }, db)
    expect(created.lifecycle_state).toBe('provisioned')

    const active1 = await activateIdentity(created.global_id, undefined, db)
    expect(active1.lifecycle_state).toBe('active')

    const suspended = await suspendIdentity(created.global_id, undefined, db)
    expect(suspended.lifecycle_state).toBe('suspended')

    const active2 = await reactivateIdentity(created.global_id, undefined, db)
    expect(active2.lifecycle_state).toBe('active')

    const deactivated = await deactivateIdentity(created.global_id, undefined, db)
    expect(deactivated.lifecycle_state).toBe('deactivated')

    const archived = await archiveIdentity(created.global_id, undefined, db)
    expect(archived.lifecycle_state).toBe('archived')
    expect(archived.archived_at).not.toBeNull()
  })

  it('also allows deactivate directly from suspended (not only from active)', async () => {
    const created = await createIdentity({ identity_type_code: 'SERVICE', display_name: 'Bot' }, db)
    await activateIdentity(created.global_id, undefined, db)
    await suspendIdentity(created.global_id, undefined, db)
    const deactivated = await deactivateIdentity(created.global_id, undefined, db)
    expect(deactivated.lifecycle_state).toBe('deactivated')
  })

  it('is idempotent for transitions whose target has exactly one producing path (suspend/deactivate/archive)', async () => {
    const created = await createIdentity({ identity_type_code: 'SERVICE', display_name: 'Bot' }, db)
    await activateIdentity(created.global_id, undefined, db)
    await suspendIdentity(created.global_id, undefined, db)
    const auditCountBefore = fake.auditLog.length
    const eventCountBefore = fake.events.length

    const again = await suspendIdentity(created.global_id, undefined, db)
    expect(again.lifecycle_state).toBe('suspended')
    expect(fake.auditLog).toHaveLength(auditCountBefore)
    expect(fake.events).toHaveLength(eventCountBefore)
  })

  it('is deliberately NOT idempotent for activate/reactivate, since both share the "active" target — ' +
     'reactivating an identity that reached Active via activate() (never suspended) is an invalid transition, not a no-op', async () => {
    const created = await createIdentity({ identity_type_code: 'SERVICE', display_name: 'Bot' }, db)
    await activateIdentity(created.global_id, undefined, db)
    await expect(activateIdentity(created.global_id, undefined, db)).rejects.toBeInstanceOf(InvalidLifecycleTransitionError)
  })

  it('rejects a transition that skips a state (e.g. archiving a Deactivated-only-reachable state directly from Active)', async () => {
    const created = await createIdentity({ identity_type_code: 'SERVICE', display_name: 'Bot' }, db)
    await activateIdentity(created.global_id, undefined, db)
    await expect(archiveIdentity(created.global_id, undefined, db)).rejects.toBeInstanceOf(InvalidLifecycleTransitionError)
  })

  it('rejects suspending an identity that was never activated', async () => {
    const created = await createIdentity({ identity_type_code: 'SERVICE', display_name: 'Bot' }, db)
    await expect(suspendIdentity(created.global_id, undefined, db)).rejects.toBeInstanceOf(InvalidLifecycleTransitionError)
  })

  it('rejects reactivating an identity that was never suspended', async () => {
    const created = await createIdentity({ identity_type_code: 'SERVICE', display_name: 'Bot' }, db)
    await activateIdentity(created.global_id, undefined, db)
    await expect(reactivateIdentity(created.global_id, undefined, db)).rejects.toBeInstanceOf(InvalidLifecycleTransitionError)
  })

  it('throws IdentityNotFoundError for an unknown global ID on any transition', async () => {
    await expect(activateIdentity('ID-PERSON-999999', undefined, db)).rejects.toBeInstanceOf(IdentityNotFoundError)
  })
})

describe('EA-001 asset linking (read-only, one-directional)', () => {
  it('links an identity to an existing EA-001 asset by global ID', async () => {
    fake.assets.push({ id: 'asset-uuid-1', global_id: 'MO-AUTO-000001' })
    const identity = await createIdentity({ identity_type_code: 'SERVICE', display_name: 'Outreach Automation' }, db)

    const linked = await linkIdentityAsset(identity.global_id, { asset_global_id: 'MO-AUTO-000001' }, db)
    expect(linked.asset_id).toBe('asset-uuid-1')
    expect(fake.auditLog.at(-1)).toMatchObject({ action: 'IdentityLinkedToAsset' })
  })

  it('rejects linking to an EA-001 asset that does not exist', async () => {
    const identity = await createIdentity({ identity_type_code: 'SERVICE', display_name: 'Bot' }, db)
    await expect(
      linkIdentityAsset(identity.global_id, { asset_global_id: 'MO-AUTO-999999' }, db)
    ).rejects.toThrow(/Enterprise asset not found/)
  })

  it('unlinks an asset, and is idempotent when already unlinked', async () => {
    fake.assets.push({ id: 'asset-uuid-1', global_id: 'MO-AUTO-000001' })
    const identity = await createIdentity({ identity_type_code: 'SERVICE', display_name: 'Bot' }, db)
    await linkIdentityAsset(identity.global_id, { asset_global_id: 'MO-AUTO-000001' }, db)

    const unlinked = await unlinkIdentityAsset(identity.global_id, undefined, db)
    expect(unlinked.asset_id).toBeNull()

    const auditCountBefore = fake.auditLog.length
    const again = await unlinkIdentityAsset(identity.global_id, undefined, db)
    expect(again.asset_id).toBeNull()
    expect(fake.auditLog).toHaveLength(auditCountBefore)
  })

  it('never writes to the enterprise_assets table (read-only integration)', async () => {
    fake.assets.push({ id: 'asset-uuid-1', global_id: 'MO-AUTO-000001' })
    const identity = await createIdentity({ identity_type_code: 'SERVICE', display_name: 'Bot' }, db)
    await linkIdentityAsset(identity.global_id, { asset_global_id: 'MO-AUTO-000001' }, db)
    expect(fake.assets).toHaveLength(1)
    expect(fake.assets[0]).toEqual({ id: 'asset-uuid-1', global_id: 'MO-AUTO-000001' })
  })
})

describe('listIdentities / searchIdentities', () => {
  beforeEach(async () => {
    await createIdentity({ identity_type_code: 'PERSON', display_name: 'Founder' }, db)
    await createIdentity({ identity_type_code: 'SERVICE', display_name: 'Outreach Automation' }, db)
    await createIdentity({ identity_type_code: 'EXTERNAL', display_name: 'Vendor Contact' }, db)
  })

  it('lists all identities with pagination metadata', async () => {
    const page = await listIdentities({}, db)
    expect(page.total).toBe(3)
    expect(page.data).toHaveLength(3)
  })

  it('filters by identity type', async () => {
    const page = await listIdentities({ identityType: 'SERVICE' }, db)
    expect(page.data).toHaveLength(1)
    expect(page.data[0].display_name).toBe('Outreach Automation')
  })

  it('searches by display name', async () => {
    const page = await searchIdentities({ q: 'Outreach' }, db)
    expect(page.data).toHaveLength(1)
    expect(page.data[0].display_name).toBe('Outreach Automation')
  })
})
