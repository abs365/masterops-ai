// EA-001 test infrastructure — an in-memory stand-in for the Postgres schema
// and RPC functions defined in supabase/migrations/007_ea001_enterprise_asset_registry.sql.
// This session has no live Supabase connection, so the SQL functions
// themselves are reviewed by hand (see the evidence pack) while this fake
// mirrors their exact business rules in TypeScript, letting the JS-facing
// contract (repository.ts, the API routes, error mapping) be exercised for
// real. Same pattern already used elsewhere in this portfolio for tests
// without live-DB access.
import type { DbClient } from '../repository'

interface AssetRow {
  id: string
  global_id: string
  asset_type_code: string
  name: string
  description: string | null
  status: string
  lifecycle_stage: string
  owner: string | null
  country: string | null
  business_domain: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  archived_at: string | null
  created_by: string
  updated_by: string
}

interface RelationshipRow {
  id: string
  source_asset_id: string
  target_asset_id: string
  relationship_type: string
  metadata: Record<string, unknown>
  created_at: string
  created_by: string
}

interface AssetTypeRow {
  code: string
  prefix: string
  label: string
  description: string | null
  active: boolean
  created_at: string
}

const SEED_ASSET_TYPES: AssetTypeRow[] = [
  { code: 'ENTERPRISE', prefix: 'ENT', label: 'Enterprise', description: null, active: true, created_at: '2026-01-01T00:00:00Z' },
  { code: 'PRODUCT', prefix: 'PROD', label: 'Product', description: null, active: true, created_at: '2026-01-01T00:00:00Z' },
  { code: 'OPERATING_SYSTEM', prefix: 'OS', label: 'Operating System', description: null, active: true, created_at: '2026-01-01T00:00:00Z' },
  { code: 'SHARED_SERVICE', prefix: 'SVC', label: 'Shared Service', description: null, active: true, created_at: '2026-01-01T00:00:00Z' },
  { code: 'CAPABILITY', prefix: 'CAP', label: 'Capability', description: null, active: true, created_at: '2026-01-01T00:00:00Z' },
  { code: 'WORKSPACE', prefix: 'WS', label: 'Workspace', description: null, active: true, created_at: '2026-01-01T00:00:00Z' },
  { code: 'TEAM', prefix: 'TEAM', label: 'Team', description: null, active: true, created_at: '2026-01-01T00:00:00Z' },
  { code: 'AUTOMATION', prefix: 'AUTO', label: 'Automation', description: null, active: true, created_at: '2026-01-01T00:00:00Z' },
  { code: 'KNOWLEDGE_ASSET', prefix: 'KA', label: 'Knowledge Asset', description: null, active: true, created_at: '2026-01-01T00:00:00Z' },
]

class FakeQueryBuilder {
  private filters: Array<(row: Record<string, unknown>) => boolean> = []
  private orFilter: ((row: Record<string, unknown>) => boolean) | null = null
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

  neq(col: string, val: unknown) {
    this.filters.push((row) => row[col] !== val)
    return this
  }

  or(expr: string) {
    const clauses = expr.split(',').map((clause) => {
      const [col, , val] = clause.split('.')
      return (row: Record<string, unknown>) => row[col] === val
    })
    this.orFilter = (row) => clauses.some((fn) => fn(row))
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
    if (this.orFilter) rows = rows.filter(this.orFilter)
    if (this.searchCol && this.searchQuery) {
      const terms = this.searchQuery.split(/\s+/).filter(Boolean)
      rows = rows.filter((row) => {
        const haystack = `${(row.name as string) ?? ''} ${(row.description as string) ?? ''}`.toLowerCase()
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

export class FakeEnterpriseAssetDb {
  assets: AssetRow[] = []
  assetTypes: AssetTypeRow[] = SEED_ASSET_TYPES.map((t) => ({ ...t }))
  relationships: RelationshipRow[] = []
  auditLog: Array<Record<string, unknown>> = []
  events: Array<Record<string, unknown>> = []

  private counters: Record<string, number> = {}
  private seq = 1

  private nextId(): string {
    return `id-${this.seq++}`
  }

  private generateGlobalId(prefix: string): string {
    const n = (this.counters[prefix] ?? 0) + 1
    this.counters[prefix] = n
    return `MO-${prefix}-${String(n).padStart(6, '0')}`
  }

  from(table: string) {
    const map: Record<string, Record<string, unknown>[]> = {
      enterprise_assets: this.assets as unknown as Record<string, unknown>[],
      enterprise_asset_types: this.assetTypes as unknown as Record<string, unknown>[],
      enterprise_asset_relationships: this.relationships as unknown as Record<string, unknown>[],
      enterprise_asset_audit_log: this.auditLog,
      enterprise_asset_events: this.events,
    }
    const rows = map[table]
    if (!rows) throw new Error(`FakeEnterpriseAssetDb: unknown table "${table}"`)
    return new FakeQueryBuilder(rows)
  }

  async rpc(fn: string, args: Record<string, unknown>): Promise<{ data: unknown; error: { message: string } | null }> {
    try {
      switch (fn) {
        case 'create_enterprise_asset':
          return { data: this.createAsset(args), error: null }
        case 'update_enterprise_asset':
          return { data: this.updateAsset(args), error: null }
        case 'archive_enterprise_asset':
          return { data: this.archiveAsset(args), error: null }
        case 'restore_enterprise_asset':
          return { data: this.restoreAsset(args), error: null }
        case 'create_enterprise_asset_relationship':
          return { data: this.createRelationship(args), error: null }
        default:
          throw new Error(`FakeEnterpriseAssetDb: unknown rpc "${fn}"`)
      }
    } catch (e) {
      return { data: null, error: { message: (e as Error).message } }
    }
  }

  private findByGlobalId(globalId: string): AssetRow | undefined {
    return this.assets.find((a) => a.global_id === globalId)
  }

  private createAsset(args: Record<string, unknown>): AssetRow {
    const typeCode = args.p_asset_type_code as string
    const type = this.assetTypes.find((t) => t.code === typeCode && t.active)
    if (!type) throw new Error(`Unknown or inactive asset_type_code: ${typeCode}`)

    const now = new Date().toISOString()
    const row: AssetRow = {
      id: this.nextId(),
      global_id: this.generateGlobalId(type.prefix),
      asset_type_code: typeCode,
      name: args.p_name as string,
      description: (args.p_description as string | null) ?? null,
      status: (args.p_status as string) ?? 'active',
      lifecycle_stage: (args.p_lifecycle_stage as string) ?? 'concept',
      owner: (args.p_owner as string | null) ?? null,
      country: (args.p_country as string | null) ?? null,
      business_domain: (args.p_business_domain as string | null) ?? null,
      metadata: (args.p_metadata as Record<string, unknown>) ?? {},
      created_at: now,
      updated_at: now,
      archived_at: null,
      created_by: (args.p_actor as string) ?? 'system',
      updated_by: (args.p_actor as string) ?? 'system',
    }
    this.assets.push(row)
    this.auditLog.push({
      id: this.nextId(), asset_id: row.id, action: 'AssetCreated',
      actor: row.created_by, before: null, after: { ...row }, occurred_at: now,
    })
    this.events.push({
      id: this.nextId(), event_type: 'AssetCreated', asset_id: row.id,
      payload: { ...row }, occurred_at: now, consumed_at: null,
    })
    return row
  }

  private updateAsset(args: Record<string, unknown>): AssetRow {
    const globalId = args.p_global_id as string
    const row = this.findByGlobalId(globalId)
    if (!row) throw new Error(`Asset not found: ${globalId}`)
    if (row.status === 'archived') {
      throw new Error(`Cannot update an archived asset; restore it first: ${globalId}`)
    }

    const before = { ...row }
    row.name = args.p_name as string
    row.description = (args.p_description as string | null) ?? null
    row.status = args.p_status as string
    row.lifecycle_stage = args.p_lifecycle_stage as string
    row.owner = (args.p_owner as string | null) ?? null
    row.country = (args.p_country as string | null) ?? null
    row.business_domain = (args.p_business_domain as string | null) ?? null
    row.metadata = (args.p_metadata as Record<string, unknown>) ?? {}
    row.updated_by = (args.p_actor as string) ?? 'system'
    row.updated_at = new Date().toISOString()
    const after = { ...row }

    this.auditLog.push({
      id: this.nextId(), asset_id: row.id, action: 'AssetUpdated',
      actor: row.updated_by, before, after, occurred_at: row.updated_at,
    })
    this.events.push({
      id: this.nextId(), event_type: 'AssetUpdated', asset_id: row.id,
      payload: { before, after }, occurred_at: row.updated_at, consumed_at: null,
    })

    if (before.lifecycle_stage !== after.lifecycle_stage) {
      this.auditLog.push({
        id: this.nextId(), asset_id: row.id, action: 'LifecycleChanged', actor: row.updated_by,
        before: { lifecycle_stage: before.lifecycle_stage }, after: { lifecycle_stage: after.lifecycle_stage },
        occurred_at: row.updated_at,
      })
      this.events.push({
        id: this.nextId(), event_type: 'LifecycleChanged', asset_id: row.id,
        payload: { global_id: row.global_id, from: before.lifecycle_stage, to: after.lifecycle_stage },
        occurred_at: row.updated_at, consumed_at: null,
      })
    }

    return row
  }

  private archiveAsset(args: Record<string, unknown>): AssetRow {
    const globalId = args.p_global_id as string
    const row = this.findByGlobalId(globalId)
    if (!row) throw new Error(`Asset not found: ${globalId}`)
    if (row.status === 'archived') return row

    const before = { ...row }
    row.status = 'archived'
    row.archived_at = new Date().toISOString()
    row.updated_by = (args.p_actor as string) ?? 'system'
    row.updated_at = row.archived_at

    this.auditLog.push({
      id: this.nextId(), asset_id: row.id, action: 'AssetArchived',
      actor: row.updated_by, before, after: { ...row }, occurred_at: row.updated_at,
    })
    this.events.push({
      id: this.nextId(), event_type: 'AssetArchived', asset_id: row.id,
      payload: { ...row }, occurred_at: row.updated_at, consumed_at: null,
    })
    return row
  }

  private restoreAsset(args: Record<string, unknown>): AssetRow {
    const globalId = args.p_global_id as string
    const row = this.findByGlobalId(globalId)
    if (!row) throw new Error(`Asset not found: ${globalId}`)
    if (row.status !== 'archived') return row

    const before = { ...row }
    row.status = 'active'
    row.archived_at = null
    row.updated_by = (args.p_actor as string) ?? 'system'
    row.updated_at = new Date().toISOString()

    this.auditLog.push({
      id: this.nextId(), asset_id: row.id, action: 'AssetRestored',
      actor: row.updated_by, before, after: { ...row }, occurred_at: row.updated_at,
    })
    return row
  }

  private createRelationship(args: Record<string, unknown>): RelationshipRow {
    const sourceGlobalId = args.p_source_global_id as string
    const targetGlobalId = args.p_target_global_id as string
    const relationshipType = args.p_relationship_type as string

    const source = this.findByGlobalId(sourceGlobalId)
    if (!source) throw new Error(`Source asset not found: ${sourceGlobalId}`)
    const target = this.findByGlobalId(targetGlobalId)
    if (!target) throw new Error(`Target asset not found: ${targetGlobalId}`)
    if (source.id === target.id) {
      throw new Error(`An asset cannot have a relationship with itself: ${sourceGlobalId}`)
    }

    const now = new Date().toISOString()
    let row = this.relationships.find(
      (r) => r.source_asset_id === source.id && r.target_asset_id === target.id && r.relationship_type === relationshipType
    )
    const existed = row !== undefined
    if (row) {
      row.metadata = (args.p_metadata as Record<string, unknown>) ?? {}
    } else {
      row = {
        id: this.nextId(), source_asset_id: source.id, target_asset_id: target.id,
        relationship_type: relationshipType, metadata: (args.p_metadata as Record<string, unknown>) ?? {},
        created_at: now, created_by: (args.p_actor as string) ?? 'system',
      }
      this.relationships.push(row)
    }

    // Mirrors migration 007's create_enterprise_asset_relationship: only
    // audit/publish on the first creation, not on a repeat idempotent
    // metadata upsert of the same (source, target, type) triple.
    if (!existed) {
      this.auditLog.push({
        id: this.nextId(), asset_id: source.id, action: 'RelationshipCreated',
        actor: (args.p_actor as string) ?? 'system', before: null, after: { ...row }, occurred_at: now,
      })
      this.events.push({
        id: this.nextId(), event_type: 'RelationshipCreated', asset_id: source.id,
        payload: { ...row, source_global_id: sourceGlobalId, target_global_id: targetGlobalId },
        occurred_at: now, consumed_at: null,
      })
    }
    return row
  }
}

export function createFakeDbClient(): DbClient {
  return new FakeEnterpriseAssetDb() as unknown as DbClient
}
