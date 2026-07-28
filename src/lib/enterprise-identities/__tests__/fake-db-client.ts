// EA-002 test infrastructure — an in-memory stand-in for the Postgres schema
// and RPC functions defined in
// supabase/migrations/008_ea002_enterprise_identity_service.sql. Mirrors
// EA-001's fake-db-client.ts pattern exactly (this session has no live
// Supabase connection, so the SQL functions are reviewed by hand — see the
// Evidence Package — while this fake mirrors their exact business rules in
// TypeScript).
//
// Also carries a minimal `enterprise_assets` table so linkIdentityAsset()'s
// call into EA-001's own getAsset() resolves against seeded fake asset rows
// when the same fake client instance is passed through — this is what makes
// the cross-service (read-only) call testable without a live DB, without
// EA-002's test fake pretending to know anything about EA-001's real schema
// beyond the two columns getAsset() actually reads (id, global_id).
import type { DbClient } from '../repository'

interface IdentityRow {
  id: string
  global_id: string
  identity_type_code: string
  display_name: string
  description: string | null
  lifecycle_state: string
  owner: string | null
  business_scope: string | null
  contact_email: string | null
  asset_id: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  archived_at: string | null
  created_by: string
  updated_by: string
}

interface IdentityTypeRow {
  code: string
  prefix: string
  label: string
  description: string | null
  active: boolean
  created_at: string
}

interface MinimalAssetRow {
  id: string
  global_id: string
  [key: string]: unknown
}

const SEED_IDENTITY_TYPES: IdentityTypeRow[] = [
  { code: 'PERSON', prefix: 'PERSON', label: 'Person', description: null, active: true, created_at: '2026-01-01T00:00:00Z' },
  { code: 'SERVICE', prefix: 'SERVICE', label: 'Service', description: null, active: true, created_at: '2026-01-01T00:00:00Z' },
  { code: 'EXTERNAL', prefix: 'EXTERNAL', label: 'External', description: null, active: true, created_at: '2026-01-01T00:00:00Z' },
]

class FakeQueryBuilder {
  private filters: Array<(row: Record<string, unknown>) => boolean> = []
  private searchCol: string | null = null
  private searchQuery: string | null = null
  private sortCol: string | null = null
  private sortAsc = true
  private rangeFrom: number | null = null
  private rangeTo: number | null = null
  private wantCount = false

  constructor(private rows: Record<string, unknown>[]) {}

  select(_cols?: string, opts?: { count?: string }) {
    if (opts?.count) this.wantCount = true
    return this
  }

  eq(col: string, val: unknown) {
    this.filters.push((row) => row[col] === val)
    return this
  }

  textSearch(col: string, query: string) {
    this.searchCol = col
    this.searchQuery = query.toLowerCase()
    return this
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this.sortCol = col
    this.sortAsc = opts?.ascending ?? true
    return this
  }

  range(from: number, to: number) {
    this.rangeFrom = from
    this.rangeTo = to
    return this
  }

  private resolve(): { rows: Record<string, unknown>[]; total: number } {
    let rows = this.rows.slice()
    for (const f of this.filters) rows = rows.filter(f)
    if (this.searchCol && this.searchQuery) {
      const terms = this.searchQuery.split(/\s+/).filter(Boolean)
      rows = rows.filter((row) => {
        const haystack = `${(row.display_name as string) ?? ''} ${(row.description as string) ?? ''}`.toLowerCase()
        return terms.every((term) => haystack.includes(term))
      })
    }
    if (this.sortCol) {
      const col = this.sortCol
      rows = rows.sort((a, b) => {
        const av = a[col] as string
        const bv = b[col] as string
        if (av < bv) return this.sortAsc ? -1 : 1
        if (av > bv) return this.sortAsc ? 1 : -1
        return 0
      })
    }
    const total = rows.length
    if (this.rangeFrom !== null && this.rangeTo !== null) {
      rows = rows.slice(this.rangeFrom, this.rangeTo + 1)
    }
    return { rows, total }
  }

  maybeSingle() {
    const { rows } = this.resolve()
    return Promise.resolve({ data: rows[0] ?? null, error: null })
  }

  then<T>(
    onFulfilled: (value: { data: Record<string, unknown>[]; error: null; count: number | null }) => T
  ) {
    const { rows, total } = this.resolve()
    return Promise.resolve(
      onFulfilled({ data: rows, error: null, count: this.wantCount ? total : null })
    )
  }
}

// `idempotent: true` means "already at target" short-circuits to a no-op
// return. Only safe when the target state has exactly one transition that
// produces it — activate and reactivate both target 'active', so neither
// gets the shortcut (mirrors migration 008's activate/reactivate functions,
// which are strict for the same reason).
const VALID_TRANSITIONS: Record<string, { target: string; from: string[]; idempotent: boolean }> = {
  activate_enterprise_identity: { target: 'active', from: ['provisioned'], idempotent: false },
  suspend_enterprise_identity: { target: 'suspended', from: ['active'], idempotent: true },
  reactivate_enterprise_identity: { target: 'active', from: ['suspended'], idempotent: false },
  deactivate_enterprise_identity: { target: 'deactivated', from: ['active', 'suspended'], idempotent: true },
  archive_enterprise_identity: { target: 'archived', from: ['deactivated'], idempotent: true },
}

const AUDIT_ACTION_BY_FN: Record<string, string> = {
  activate_enterprise_identity: 'IdentityActivated',
  suspend_enterprise_identity: 'IdentitySuspended',
  reactivate_enterprise_identity: 'IdentityReactivated',
  deactivate_enterprise_identity: 'IdentityDeactivated',
  archive_enterprise_identity: 'IdentityArchived',
}

export class FakeEnterpriseIdentityDb {
  identities: IdentityRow[] = []
  identityTypes: IdentityTypeRow[] = SEED_IDENTITY_TYPES.map((t) => ({ ...t }))
  auditLog: Array<Record<string, unknown>> = []
  events: Array<Record<string, unknown>> = []
  // Seeded directly by tests that exercise linkIdentityAsset/unlinkIdentityAsset.
  assets: MinimalAssetRow[] = []

  private counters: Record<string, number> = {}
  private seq = 1

  private nextId(): string {
    return `id-${this.seq++}`
  }

  private generateGlobalId(prefix: string): string {
    const n = (this.counters[prefix] ?? 0) + 1
    this.counters[prefix] = n
    return `ID-${prefix}-${String(n).padStart(6, '0')}`
  }

  from(table: string) {
    const map: Record<string, Record<string, unknown>[]> = {
      enterprise_identities: this.identities as unknown as Record<string, unknown>[],
      enterprise_identity_types: this.identityTypes as unknown as Record<string, unknown>[],
      enterprise_identity_audit_log: this.auditLog,
      enterprise_identity_events: this.events,
      // Minimal EA-001 stand-in — see file header.
      enterprise_assets: this.assets as unknown as Record<string, unknown>[],
    }
    const rows = map[table]
    if (!rows) throw new Error(`FakeEnterpriseIdentityDb: unknown table "${table}"`)
    return new FakeQueryBuilder(rows)
  }

  async rpc(fn: string, args: Record<string, unknown>): Promise<{ data: unknown; error: { message: string } | null }> {
    try {
      if (fn === 'create_enterprise_identity') return { data: this.createIdentity(args), error: null }
      if (fn === 'update_enterprise_identity') return { data: this.updateIdentity(args), error: null }
      if (fn === 'link_enterprise_identity_asset') return { data: this.linkAsset(args), error: null }
      if (fn === 'unlink_enterprise_identity_asset') return { data: this.unlinkAsset(args), error: null }
      if (fn in VALID_TRANSITIONS) return { data: this.transition(fn, args), error: null }
      throw new Error(`FakeEnterpriseIdentityDb: unknown rpc "${fn}"`)
    } catch (e) {
      return { data: null, error: { message: (e as Error).message } }
    }
  }

  private findByGlobalId(globalId: string): IdentityRow | undefined {
    return this.identities.find((i) => i.global_id === globalId)
  }

  private createIdentity(args: Record<string, unknown>): IdentityRow {
    const typeCode = args.p_identity_type_code as string
    const type = this.identityTypes.find((t) => t.code === typeCode && t.active)
    if (!type) throw new Error(`Unknown or inactive identity_type_code: ${typeCode}`)

    const now = new Date().toISOString()
    const row: IdentityRow = {
      id: this.nextId(),
      global_id: this.generateGlobalId(type.prefix),
      identity_type_code: typeCode,
      display_name: args.p_display_name as string,
      description: (args.p_description as string | null) ?? null,
      lifecycle_state: 'provisioned',
      owner: (args.p_owner as string | null) ?? null,
      business_scope: (args.p_business_scope as string | null) ?? null,
      contact_email: (args.p_contact_email as string | null) ?? null,
      asset_id: null,
      metadata: (args.p_metadata as Record<string, unknown>) ?? {},
      created_at: now,
      updated_at: now,
      archived_at: null,
      created_by: (args.p_actor as string) ?? 'system',
      updated_by: (args.p_actor as string) ?? 'system',
    }
    this.identities.push(row)
    this.auditLog.push({
      id: this.nextId(), identity_id: row.id, action: 'IdentityCreated',
      actor: row.created_by, before: null, after: { ...row }, occurred_at: now,
    })
    this.events.push({
      id: this.nextId(), event_type: 'IdentityCreated', identity_id: row.id,
      payload: { ...row }, occurred_at: now, consumed_at: null,
    })
    return row
  }

  private updateIdentity(args: Record<string, unknown>): IdentityRow {
    const globalId = args.p_global_id as string
    const row = this.findByGlobalId(globalId)
    if (!row) throw new Error(`Identity not found: ${globalId}`)
    if (row.lifecycle_state === 'archived') {
      throw new Error(`Cannot update an archived identity (archived is terminal, no restore path): ${globalId}`)
    }

    const before = { ...row }
    row.display_name = args.p_display_name as string
    row.description = (args.p_description as string | null) ?? null
    row.owner = (args.p_owner as string | null) ?? null
    row.business_scope = (args.p_business_scope as string | null) ?? null
    row.contact_email = (args.p_contact_email as string | null) ?? null
    row.metadata = (args.p_metadata as Record<string, unknown>) ?? {}
    row.updated_by = (args.p_actor as string) ?? 'system'
    row.updated_at = new Date().toISOString()
    const after = { ...row }

    this.auditLog.push({
      id: this.nextId(), identity_id: row.id, action: 'IdentityUpdated',
      actor: row.updated_by, before, after, occurred_at: row.updated_at,
    })
    this.events.push({
      id: this.nextId(), event_type: 'IdentityUpdated', identity_id: row.id,
      payload: { before, after }, occurred_at: row.updated_at, consumed_at: null,
    })
    return row
  }

  private transition(fn: string, args: Record<string, unknown>): IdentityRow {
    const globalId = args.p_global_id as string
    const row = this.findByGlobalId(globalId)
    if (!row) throw new Error(`Identity not found: ${globalId}`)

    const { target, from, idempotent } = VALID_TRANSITIONS[fn]
    if (idempotent && row.lifecycle_state === target) return row
    if (!from.includes(row.lifecycle_state)) {
      const verb = fn.split('_')[0]
      if (fn === 'archive_enterprise_identity') {
        throw new Error(`Cannot archive identity from state "${row.lifecycle_state}"; must be Deactivated first: ${globalId}`)
      }
      throw new Error(`Cannot ${verb} identity from state "${row.lifecycle_state}": ${globalId}`)
    }

    const before = { ...row }
    row.lifecycle_state = target
    row.updated_by = (args.p_actor as string) ?? 'system'
    row.updated_at = new Date().toISOString()
    if (target === 'archived') row.archived_at = row.updated_at
    const after = { ...row }

    const action = AUDIT_ACTION_BY_FN[fn]
    this.auditLog.push({
      id: this.nextId(), identity_id: row.id, action,
      actor: row.updated_by, before, after, occurred_at: row.updated_at,
    })
    this.events.push({
      id: this.nextId(), event_type: action, identity_id: row.id,
      payload: after, occurred_at: row.updated_at, consumed_at: null,
    })
    return row
  }

  private linkAsset(args: Record<string, unknown>): IdentityRow {
    const globalId = args.p_global_id as string
    const row = this.findByGlobalId(globalId)
    if (!row) throw new Error(`Identity not found: ${globalId}`)
    if (row.lifecycle_state === 'archived') throw new Error(`Cannot modify an archived identity: ${globalId}`)

    const before = { ...row }
    row.asset_id = args.p_asset_id as string
    row.updated_by = (args.p_actor as string) ?? 'system'
    row.updated_at = new Date().toISOString()
    const after = { ...row }

    this.auditLog.push({
      id: this.nextId(), identity_id: row.id, action: 'IdentityLinkedToAsset',
      actor: row.updated_by, before, after, occurred_at: row.updated_at,
    })
    this.events.push({
      id: this.nextId(), event_type: 'IdentityLinkedToAsset', identity_id: row.id,
      payload: after, occurred_at: row.updated_at, consumed_at: null,
    })
    return row
  }

  private unlinkAsset(args: Record<string, unknown>): IdentityRow {
    const globalId = args.p_global_id as string
    const row = this.findByGlobalId(globalId)
    if (!row) throw new Error(`Identity not found: ${globalId}`)
    if (row.lifecycle_state === 'archived') throw new Error(`Cannot modify an archived identity: ${globalId}`)
    if (row.asset_id === null) return row

    const before = { ...row }
    row.asset_id = null
    row.updated_by = (args.p_actor as string) ?? 'system'
    row.updated_at = new Date().toISOString()
    const after = { ...row }

    this.auditLog.push({
      id: this.nextId(), identity_id: row.id, action: 'IdentityUnlinkedFromAsset',
      actor: row.updated_by, before, after, occurred_at: row.updated_at,
    })
    this.events.push({
      id: this.nextId(), event_type: 'IdentityUnlinkedFromAsset', identity_id: row.id,
      payload: after, occurred_at: row.updated_at, consumed_at: null,
    })
    return row
  }
}

export function createFakeIdentityDbClient(): DbClient {
  return new FakeEnterpriseIdentityDb() as unknown as DbClient
}
