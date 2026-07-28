// EA-002 — data access layer. Mutations go through the atomic Postgres
// functions from migration 008 (mutation + audit + event in one transaction);
// reads use the Supabase query builder directly. Mirrors EA-001's
// repository.ts structure exactly for platform consistency.
//
// The only place this file talks to EA-001 is linkIdentityAsset(), which
// calls EA-001's own getAsset() repository function directly (same-process,
// explicitly permitted by the Design Spec §3/§7) — a read-only call through
// EA-001's own public contract, never a direct query against
// enterprise_assets from this service.
import { createServiceClient } from '@/lib/supabase/server'
import { getAsset, AssetNotFoundError } from '@/lib/enterprise-assets/repository'
import type {
  EnterpriseIdentity, EnterpriseIdentityType,
  CreateIdentityInput, UpdateIdentityInput, LinkIdentityAssetInput,
  ListIdentitiesQuery, SearchIdentitiesQuery, PaginatedResult,
} from '@/types'
import { DEFAULT_PAGE_SIZE } from './constants'

export type DbClient = Awaited<ReturnType<typeof createServiceClient>>

export class IdentityNotFoundError extends Error {
  constructor(detail: string) {
    const message = detail.toLowerCase().includes('not found') ? detail : `Enterprise identity not found: ${detail}`
    super(message)
    this.name = 'IdentityNotFoundError'
  }
}

export class UnknownIdentityTypeError extends Error {
  constructor(detail: string) {
    const message = detail.toLowerCase().includes('unknown or inactive')
      ? detail
      : `Unknown or inactive identity type: ${detail}`
    super(message)
    this.name = 'UnknownIdentityTypeError'
  }
}

// A lifecycle mutation (activate/suspend/reactivate/deactivate/archive) or an
// update/link/unlink call attempted from a state the Design Spec §2 state
// diagram doesn't allow (e.g. archiving an identity that isn't yet
// Deactivated). Distinct from IdentityNotFoundError so callers get 409, not
// 404/500 — the identity exists, the requested transition just isn't valid
// from its current state.
export class InvalidLifecycleTransitionError extends Error {
  constructor(detail: string) {
    super(detail)
    this.name = 'InvalidLifecycleTransitionError'
  }
}

async function resolveClient(supplied?: DbClient): Promise<DbClient> {
  return supplied ?? (await createServiceClient())
}

function rpcErrorToDomainError(message: string): Error {
  if (message.includes('Unknown or inactive identity_type_code')) return new UnknownIdentityTypeError(message)
  if (message.startsWith('Cannot ')) return new InvalidLifecycleTransitionError(message)
  if (message.includes('not found')) return new IdentityNotFoundError(message)
  return new Error(message)
}

export async function getIdentityTypes(supabase?: DbClient): Promise<EnterpriseIdentityType[]> {
  const db = await resolveClient(supabase)
  const { data, error } = await db.from('enterprise_identity_types').select('*').eq('active', true).order('code')
  if (error) throw new Error(error.message)
  return (data ?? []) as EnterpriseIdentityType[]
}

export async function identityTypeExists(code: string, supabase?: DbClient): Promise<boolean> {
  const db = await resolveClient(supabase)
  const { data, error } = await db
    .from('enterprise_identity_types')
    .select('code')
    .eq('code', code)
    .eq('active', true)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data !== null
}

export async function createIdentity(input: CreateIdentityInput, supabase?: DbClient): Promise<EnterpriseIdentity> {
  const db = await resolveClient(supabase)
  const { data, error } = await db.rpc('create_enterprise_identity', {
    p_identity_type_code: input.identity_type_code,
    p_display_name: input.display_name,
    p_description: input.description ?? null,
    p_owner: input.owner ?? null,
    p_business_scope: input.business_scope ?? null,
    p_contact_email: input.contact_email ?? null,
    p_metadata: input.metadata ?? {},
    p_actor: input.actor ?? 'system',
  })
  if (error) throw rpcErrorToDomainError(error.message)
  return data as EnterpriseIdentity
}

export async function getIdentity(globalId: string, supabase?: DbClient): Promise<EnterpriseIdentity | null> {
  const db = await resolveClient(supabase)
  const { data, error } = await db.from('enterprise_identities').select('*').eq('global_id', globalId).maybeSingle()
  if (error) throw new Error(error.message)
  return (data as EnterpriseIdentity | null) ?? null
}

export async function updateIdentity(globalId: string, patch: UpdateIdentityInput, supabase?: DbClient): Promise<EnterpriseIdentity> {
  const db = await resolveClient(supabase)
  const current = await getIdentity(globalId, db)
  if (!current) throw new IdentityNotFoundError(globalId)

  const resolved = {
    display_name: patch.display_name ?? current.display_name,
    description: patch.description !== undefined ? patch.description : current.description,
    owner: patch.owner !== undefined ? patch.owner : current.owner,
    business_scope: patch.business_scope !== undefined ? patch.business_scope : current.business_scope,
    contact_email: patch.contact_email !== undefined ? patch.contact_email : current.contact_email,
    metadata: patch.metadata ?? current.metadata,
  }

  const { data, error } = await db.rpc('update_enterprise_identity', {
    p_global_id: globalId,
    p_display_name: resolved.display_name,
    p_description: resolved.description,
    p_owner: resolved.owner,
    p_business_scope: resolved.business_scope,
    p_contact_email: resolved.contact_email,
    p_metadata: resolved.metadata,
    p_actor: patch.actor ?? 'system',
  })
  if (error) throw rpcErrorToDomainError(error.message)
  return data as EnterpriseIdentity
}

async function callLifecycleRpc(fn: string, globalId: string, actor: string | undefined, supabase?: DbClient): Promise<EnterpriseIdentity> {
  const db = await resolveClient(supabase)
  const { data, error } = await db.rpc(fn, { p_global_id: globalId, p_actor: actor ?? 'system' })
  if (error) throw rpcErrorToDomainError(error.message)
  return data as EnterpriseIdentity
}

export async function activateIdentity(globalId: string, actor: string | undefined, supabase?: DbClient): Promise<EnterpriseIdentity> {
  return callLifecycleRpc('activate_enterprise_identity', globalId, actor, supabase)
}

export async function suspendIdentity(globalId: string, actor: string | undefined, supabase?: DbClient): Promise<EnterpriseIdentity> {
  return callLifecycleRpc('suspend_enterprise_identity', globalId, actor, supabase)
}

export async function reactivateIdentity(globalId: string, actor: string | undefined, supabase?: DbClient): Promise<EnterpriseIdentity> {
  return callLifecycleRpc('reactivate_enterprise_identity', globalId, actor, supabase)
}

export async function deactivateIdentity(globalId: string, actor: string | undefined, supabase?: DbClient): Promise<EnterpriseIdentity> {
  return callLifecycleRpc('deactivate_enterprise_identity', globalId, actor, supabase)
}

export async function archiveIdentity(globalId: string, actor: string | undefined, supabase?: DbClient): Promise<EnterpriseIdentity> {
  return callLifecycleRpc('archive_enterprise_identity', globalId, actor, supabase)
}

// Resolves the target EA-001 asset through EA-001's own read-only repository
// function (never a direct query against enterprise_assets from this
// service), then sets the FK via this service's own RPC. Two DB round-trips,
// not one cross-service transaction — EA-001's read and this write are
// deliberately not atomic with each other, consistent with the one-directional,
// read-only integration boundary the design requires (ADR-002 decision 3).
export async function linkIdentityAsset(globalId: string, input: LinkIdentityAssetInput, supabase?: DbClient): Promise<EnterpriseIdentity> {
  const db = await resolveClient(supabase)

  const identity = await getIdentity(globalId, db)
  if (!identity) throw new IdentityNotFoundError(globalId)

  // Reuses the already-resolved client rather than letting getAsset() resolve
  // its own — in production this is the same real Supabase connection either
  // way (one fewer redundant resolution); in tests it's what lets a single
  // fake client expose both enterprise_assets and enterprise_identities.
  const asset = await getAsset(input.asset_global_id, db)
  if (!asset) throw new AssetNotFoundError(input.asset_global_id)

  const { data, error } = await db.rpc('link_enterprise_identity_asset', {
    p_global_id: globalId,
    p_asset_id: asset.id,
    p_actor: input.actor ?? 'system',
  })
  if (error) throw rpcErrorToDomainError(error.message)
  return data as EnterpriseIdentity
}

export async function unlinkIdentityAsset(globalId: string, actor: string | undefined, supabase?: DbClient): Promise<EnterpriseIdentity> {
  return callLifecycleRpc('unlink_enterprise_identity_asset', globalId, actor, supabase)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyListFilters(query: any, filters: ListIdentitiesQuery) {
  if (filters.identityType) query = query.eq('identity_type_code', filters.identityType)
  if (filters.lifecycleState) query = query.eq('lifecycle_state', filters.lifecycleState)
  if (filters.owner) query = query.eq('owner', filters.owner)
  if (filters.businessScope) query = query.eq('business_scope', filters.businessScope)
  return query
}

export async function listIdentities(filters: ListIdentitiesQuery, supabase?: DbClient): Promise<PaginatedResult<EnterpriseIdentity>> {
  const db = await resolveClient(supabase)
  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE
  const sortBy = filters.sortBy ?? 'created_at'
  const sortDir = filters.sortDir ?? 'desc'
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = db.from('enterprise_identities').select('*', { count: 'exact' })
  query = applyListFilters(query, filters)
  query = query.order(sortBy, { ascending: sortDir === 'asc' }).range(from, to)

  const { data, error, count } = await query
  if (error) throw new Error(error.message)

  return { data: (data ?? []) as EnterpriseIdentity[], page, pageSize, total: count ?? 0 }
}

export async function searchIdentities(filters: SearchIdentitiesQuery, supabase?: DbClient): Promise<PaginatedResult<EnterpriseIdentity>> {
  const db = await resolveClient(supabase)
  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = db.from('enterprise_identities').select('*', { count: 'exact' })
  query = applyListFilters(query, filters)
  query = query.textSearch('search_vector', filters.q, { type: 'websearch', config: 'english' })
  query = query.order(filters.sortBy ?? 'created_at', { ascending: (filters.sortDir ?? 'desc') === 'asc' }).range(from, to)

  const { data, error, count } = await query
  if (error) throw new Error(error.message)

  return { data: (data ?? []) as EnterpriseIdentity[], page, pageSize, total: count ?? 0 }
}
