// EA-001 — data access layer. Mutations go through the atomic Postgres
// functions from migration 007 (mutation + audit + event in one transaction);
// reads use the Supabase query builder directly, matching the rest of the repo.
//
// Every function accepts an optional Supabase client so it can be exercised
// in tests against an in-memory fake without a live database connection
// (createServiceClient() requires a Next.js request context and is only
// resolved lazily when no client is supplied).
import { createServiceClient } from '@/lib/supabase/server'
import type {
  EnterpriseAsset, EnterpriseAssetType, EnterpriseAssetRelationship,
  CreateAssetInput, UpdateAssetInput, CreateRelationshipInput,
  ListAssetsQuery, SearchAssetsQuery, PaginatedResult,
} from '@/types'
import { DEFAULT_PAGE_SIZE } from './constants'

export type DbClient = Awaited<ReturnType<typeof createServiceClient>>

// `detail` is either a bare identifier (existing call sites that already
// know exactly which asset is missing, e.g. a 404 built from a route's own
// globalId param) or a full message straight from Postgres (RPC error
// paths, where the failing asset may be a *different* one than the caller
// originally passed in — e.g. a relationship's target, not its source — so
// re-templating around a single assumed ID would misreport which asset was
// actually missing).
export class AssetNotFoundError extends Error {
  constructor(detail: string) {
    const message = detail.toLowerCase().includes('not found') ? detail : `Enterprise asset not found: ${detail}`
    super(message)
    this.name = 'AssetNotFoundError'
  }
}

export class UnknownAssetTypeError extends Error {
  constructor(detail: string) {
    const message = detail.toLowerCase().includes('unknown or inactive')
      ? detail
      : `Unknown or inactive asset type: ${detail}`
    super(message)
    this.name = 'UnknownAssetTypeError'
  }
}

async function resolveClient(supplied?: DbClient): Promise<DbClient> {
  return supplied ?? (await createServiceClient())
}

function rpcErrorToDomainError(message: string): Error {
  if (message.includes('not found')) return new AssetNotFoundError(message)
  if (message.includes('Unknown or inactive asset_type_code')) return new UnknownAssetTypeError(message)
  return new Error(message)
}

export async function getAssetTypes(supabase?: DbClient): Promise<EnterpriseAssetType[]> {
  const db = await resolveClient(supabase)
  const { data, error } = await db.from('enterprise_asset_types').select('*').eq('active', true).order('code')
  if (error) throw new Error(error.message)
  return (data ?? []) as EnterpriseAssetType[]
}

export async function assetTypeExists(code: string, supabase?: DbClient): Promise<boolean> {
  const db = await resolveClient(supabase)
  const { data, error } = await db
    .from('enterprise_asset_types')
    .select('code')
    .eq('code', code)
    .eq('active', true)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data !== null
}

export async function createAsset(input: CreateAssetInput, supabase?: DbClient): Promise<EnterpriseAsset> {
  const db = await resolveClient(supabase)
  const { data, error } = await db.rpc('create_enterprise_asset', {
    p_asset_type_code: input.asset_type_code,
    p_name: input.name,
    p_description: input.description ?? null,
    p_status: input.status ?? 'active',
    p_lifecycle_stage: input.lifecycle_stage ?? 'concept',
    p_owner: input.owner ?? null,
    p_country: input.country ?? null,
    p_business_domain: input.business_domain ?? null,
    p_metadata: input.metadata ?? {},
    p_actor: input.actor ?? 'system',
  })
  if (error) throw rpcErrorToDomainError(error.message)
  return data as EnterpriseAsset
}

export async function getAsset(globalId: string, supabase?: DbClient): Promise<EnterpriseAsset | null> {
  const db = await resolveClient(supabase)
  const { data, error } = await db.from('enterprise_assets').select('*').eq('global_id', globalId).maybeSingle()
  if (error) throw new Error(error.message)
  return (data as EnterpriseAsset | null) ?? null
}

export async function updateAsset(globalId: string, patch: UpdateAssetInput, supabase?: DbClient): Promise<EnterpriseAsset> {
  const db = await resolveClient(supabase)
  const current = await getAsset(globalId, db)
  if (!current) throw new AssetNotFoundError(globalId)

  const resolved = {
    name: patch.name ?? current.name,
    description: patch.description !== undefined ? patch.description : current.description,
    status: patch.status ?? current.status,
    lifecycle_stage: patch.lifecycle_stage ?? current.lifecycle_stage,
    owner: patch.owner !== undefined ? patch.owner : current.owner,
    country: patch.country !== undefined ? patch.country : current.country,
    business_domain: patch.business_domain !== undefined ? patch.business_domain : current.business_domain,
    metadata: patch.metadata ?? current.metadata,
  }

  const { data, error } = await db.rpc('update_enterprise_asset', {
    p_global_id: globalId,
    p_name: resolved.name,
    p_description: resolved.description,
    p_status: resolved.status,
    p_lifecycle_stage: resolved.lifecycle_stage,
    p_owner: resolved.owner,
    p_country: resolved.country,
    p_business_domain: resolved.business_domain,
    p_metadata: resolved.metadata,
    p_actor: patch.actor ?? 'system',
  })
  if (error) throw rpcErrorToDomainError(error.message)
  return data as EnterpriseAsset
}

export async function archiveAsset(globalId: string, actor: string | undefined, supabase?: DbClient): Promise<EnterpriseAsset> {
  const db = await resolveClient(supabase)
  const { data, error } = await db.rpc('archive_enterprise_asset', { p_global_id: globalId, p_actor: actor ?? 'system' })
  if (error) throw rpcErrorToDomainError(error.message)
  return data as EnterpriseAsset
}

export async function restoreAsset(globalId: string, actor: string | undefined, supabase?: DbClient): Promise<EnterpriseAsset> {
  const db = await resolveClient(supabase)
  const { data, error } = await db.rpc('restore_enterprise_asset', { p_global_id: globalId, p_actor: actor ?? 'system' })
  if (error) throw rpcErrorToDomainError(error.message)
  return data as EnterpriseAsset
}

export async function createRelationship(input: CreateRelationshipInput, supabase?: DbClient): Promise<EnterpriseAssetRelationship> {
  const db = await resolveClient(supabase)
  const { data, error } = await db.rpc('create_enterprise_asset_relationship', {
    p_source_global_id: input.source_global_id,
    p_target_global_id: input.target_global_id,
    p_relationship_type: input.relationship_type,
    p_metadata: input.metadata ?? {},
    p_actor: input.actor ?? 'system',
  })
  if (error) throw rpcErrorToDomainError(error.message)
  return data as EnterpriseAssetRelationship
}

export async function listRelationships(globalId: string, supabase?: DbClient): Promise<EnterpriseAssetRelationship[]> {
  const db = await resolveClient(supabase)
  const asset = await getAsset(globalId, db)
  if (!asset) throw new AssetNotFoundError(globalId)

  const { data, error } = await db
    .from('enterprise_asset_relationships')
    .select('*')
    .or(`source_asset_id.eq.${asset.id},target_asset_id.eq.${asset.id}`)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as EnterpriseAssetRelationship[]
}

// Supabase's fluent query builder type narrows per call, so a
// reassigned/filtered builder is typed loosely here, matching the rest of
// the codebase's convention for chained Supabase queries.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyListFilters(query: any, filters: ListAssetsQuery) {
  if (filters.assetType) query = query.eq('asset_type_code', filters.assetType)
  if (filters.status) query = query.eq('status', filters.status)
  else if (!filters.includeArchived) query = query.neq('status', 'archived')
  if (filters.lifecycleStage) query = query.eq('lifecycle_stage', filters.lifecycleStage)
  if (filters.owner) query = query.eq('owner', filters.owner)
  if (filters.businessDomain) query = query.eq('business_domain', filters.businessDomain)
  if (filters.country) query = query.eq('country', filters.country)
  return query
}

export async function listAssets(filters: ListAssetsQuery, supabase?: DbClient): Promise<PaginatedResult<EnterpriseAsset>> {
  const db = await resolveClient(supabase)
  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE
  const sortBy = filters.sortBy ?? 'created_at'
  const sortDir = filters.sortDir ?? 'desc'
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = db.from('enterprise_assets').select('*', { count: 'exact' })
  query = applyListFilters(query, filters)
  query = query.order(sortBy, { ascending: sortDir === 'asc' }).range(from, to)

  const { data, error, count } = await query
  if (error) throw new Error(error.message)

  return { data: (data ?? []) as EnterpriseAsset[], page, pageSize, total: count ?? 0 }
}

export async function searchAssets(filters: SearchAssetsQuery, supabase?: DbClient): Promise<PaginatedResult<EnterpriseAsset>> {
  const db = await resolveClient(supabase)
  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = db.from('enterprise_assets').select('*', { count: 'exact' })
  query = applyListFilters(query, filters)
  query = query.textSearch('search_vector', filters.q, { type: 'websearch', config: 'english' })
  query = query.order(filters.sortBy ?? 'created_at', { ascending: (filters.sortDir ?? 'desc') === 'asc' }).range(from, to)

  const { data, error, count } = await query
  if (error) throw new Error(error.message)

  return { data: (data ?? []) as EnterpriseAsset[], page, pageSize, total: count ?? 0 }
}
