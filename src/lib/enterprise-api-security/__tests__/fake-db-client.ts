// EA-003 test infrastructure — in-memory stand-in for migration 009's
// tables/functions, composed with EA-002's own fake identity DB (delegation,
// not reimplementation) so tests can exercise real identity lifecycle
// transitions (activate/suspend/etc.) exactly as EA-002 itself tests them,
// without a third copy of that state machine's logic.
import { FakeEnterpriseIdentityDb } from '@/lib/enterprise-identities/__tests__/fake-db-client'
import type { DbClient } from '../repository'

interface CredentialRow {
  id: string
  identity_id: string
  credential_prefix: string
  secret_hash: string
  scopes: string[]
  status: 'active' | 'revoked' | 'expired'
  expires_at: string | null
  created_at: string
  revoked_at: string | null
  last_used_at: string | null
  created_by: string
}

class SimpleQueryBuilder {
  private filters: Array<(row: Record<string, unknown>) => boolean> = []
  private sortCol: string | null = null
  private sortAsc = true

  constructor(private rows: Record<string, unknown>[]) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- matches the real Supabase client's select(cols) signature
  select(_cols?: string) {
    return this
  }

  eq(col: string, val: unknown) {
    this.filters.push((row) => row[col] === val)
    return this
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this.sortCol = col
    this.sortAsc = opts?.ascending ?? true
    return this
  }

  private resolve(): Record<string, unknown>[] {
    let rows = this.rows.slice()
    for (const f of this.filters) rows = rows.filter(f)
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
    return rows
  }

  maybeSingle() {
    const rows = this.resolve()
    return Promise.resolve({ data: rows[0] ?? null, error: null })
  }

  then<T>(onFulfilled: (value: { data: Record<string, unknown>[]; error: null }) => T) {
    return Promise.resolve(onFulfilled({ data: this.resolve(), error: null }))
  }
}

class InsertBuilder {
  constructor(private rows: Record<string, unknown>[], private toInsert: Record<string, unknown>) {}

  then<T>(onFulfilled: (value: { error: null }) => T) {
    this.rows.push({ id: `req-${this.rows.length + 1}`, ...this.toInsert })
    return Promise.resolve(onFulfilled({ error: null }))
  }
}

export class FakeSecureFoundationDb {
  identityDb = new FakeEnterpriseIdentityDb()
  apiCredentials: CredentialRow[] = []
  apiCredentialAuditLog: Record<string, unknown>[] = []
  apiRequestLog: Record<string, unknown>[] = []

  private seq = 1
  private nextId(): string {
    return `eapi-${this.seq++}`
  }

  from(table: string) {
    if (table === 'enterprise_api_credentials') return new SimpleQueryBuilder(this.apiCredentials as unknown as Record<string, unknown>[])
    if (table === 'enterprise_api_credential_audit_log') return new SimpleQueryBuilder(this.apiCredentialAuditLog)
    if (table === 'enterprise_api_request_log') {
      // insert() is only ever called on this table in this codebase — return
      // a builder whose .select()/.eq()/.order() chain still works for
      // listRequestLog(), and whose .insert() works for logRequest().
      const builder = new SimpleQueryBuilder(this.apiRequestLog) as SimpleQueryBuilder & { insert: (row: Record<string, unknown>) => InsertBuilder }
      builder.insert = (row: Record<string, unknown>) => new InsertBuilder(this.apiRequestLog, row)
      return builder
    }
    return this.identityDb.from(table)
  }

  async rpc(fn: string, args: Record<string, unknown>): Promise<{ data: unknown; error: { message: string } | null }> {
    try {
      if (fn === 'create_enterprise_api_credential') return { data: this.createCredential(args), error: null }
      if (fn === 'revoke_enterprise_api_credential') return { data: this.revokeCredential(args), error: null }
      if (fn === 'touch_enterprise_api_credential_last_used') return { data: this.touchLastUsed(args), error: null }
      return this.identityDb.rpc(fn, args)
    } catch (e) {
      return { data: null, error: { message: (e as Error).message } }
    }
  }

  private createCredential(args: Record<string, unknown>): CredentialRow {
    const identityId = args.p_identity_id as string
    if (!this.identityDb.identities.find((i) => i.id === identityId)) {
      throw new Error(`Identity not found: ${identityId}`)
    }
    const now = new Date().toISOString()
    const row: CredentialRow = {
      id: this.nextId(),
      identity_id: identityId,
      credential_prefix: args.p_credential_prefix as string,
      secret_hash: args.p_secret_hash as string,
      scopes: (args.p_scopes as string[]) ?? [],
      status: 'active',
      expires_at: (args.p_expires_at as string | null) ?? null,
      created_at: now,
      revoked_at: null,
      last_used_at: null,
      created_by: (args.p_actor as string) ?? 'system',
    }
    this.apiCredentials.push(row)
    this.apiCredentialAuditLog.push({
      id: this.nextId(), credential_id: row.id, action: 'CredentialCreated',
      actor: row.created_by, before: null, after: { ...row, secret_hash: undefined }, occurred_at: now,
    })
    return row
  }

  private revokeCredential(args: Record<string, unknown>): CredentialRow {
    const id = args.p_credential_id as string
    const row = this.apiCredentials.find((c) => c.id === id)
    if (!row) throw new Error(`Credential not found: ${id}`)
    if (row.status === 'revoked') return row

    const before = { ...row }
    row.status = 'revoked'
    row.revoked_at = new Date().toISOString()

    this.apiCredentialAuditLog.push({
      id: this.nextId(), credential_id: row.id, action: 'CredentialRevoked',
      actor: (args.p_actor as string) ?? 'system',
      before: { ...before, secret_hash: undefined }, after: { ...row, secret_hash: undefined },
      occurred_at: row.revoked_at,
    })
    return row
  }

  private touchLastUsed(args: Record<string, unknown>): null {
    const id = args.p_credential_id as string
    const row = this.apiCredentials.find((c) => c.id === id)
    if (row) row.last_used_at = new Date().toISOString()
    return null
  }
}

export function createFakeSecureFoundationDbClient(): DbClient {
  return new FakeSecureFoundationDb() as unknown as DbClient
}
