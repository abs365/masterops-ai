// EA-001 Enterprise Asset Registry — types.
// Asset TYPE is intentionally not a closed union: the DB lookup table
// (enterprise_asset_types) is the source of truth, so a new type can be added
// with a row insert, never a code change. AssetTypeCode is typed as `string`
// and validated against the DB at runtime (see validation.ts / repository.ts).
export type AssetTypeCode = string

export type AssetStatus = 'active' | 'inactive' | 'archived'

// Mirrors the BusinessStage vocabulary already used by enterprise-registry.ts
// (Concept/Building/Pilot/Live/Growing/Scaling), extended with Deprecated/
// Retired since assets outlive individual businesses.
export type LifecycleStage =
  | 'concept'
  | 'building'
  | 'pilot'
  | 'live'
  | 'growing'
  | 'scaling'
  | 'deprecated'
  | 'retired'

export const LIFECYCLE_STAGES: LifecycleStage[] = [
  'concept', 'building', 'pilot', 'live', 'growing', 'scaling', 'deprecated', 'retired',
]

export const ASSET_STATUSES: AssetStatus[] = ['active', 'inactive', 'archived']

export type AuditAction =
  | 'AssetCreated'
  | 'AssetUpdated'
  | 'AssetArchived'
  | 'AssetRestored'
  | 'RelationshipCreated'
  | 'LifecycleChanged'

export type AssetEventType =
  | 'AssetCreated'
  | 'AssetUpdated'
  | 'AssetArchived'
  | 'RelationshipCreated'
  | 'LifecycleChanged'

export interface EnterpriseAssetType {
  code: string
  prefix: string
  label: string
  description: string | null
  active: boolean
  created_at: string
}

export interface EnterpriseAsset {
  id: string
  global_id: string
  asset_type_code: string
  name: string
  description: string | null
  status: AssetStatus
  lifecycle_stage: LifecycleStage
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

export interface EnterpriseAssetRelationship {
  id: string
  source_asset_id: string
  target_asset_id: string
  relationship_type: string
  metadata: Record<string, unknown>
  created_at: string
  created_by: string
}

export interface EnterpriseAssetAuditRecord {
  id: string
  asset_id: string | null
  action: AuditAction
  actor: string
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  occurred_at: string
}

export interface EnterpriseAssetEvent {
  id: string
  event_type: AssetEventType
  asset_id: string | null
  payload: Record<string, unknown>
  occurred_at: string
  consumed_at: string | null
}

export interface CreateAssetInput {
  asset_type_code: string
  name: string
  description?: string | null
  status?: AssetStatus
  lifecycle_stage?: LifecycleStage
  owner?: string | null
  country?: string | null
  business_domain?: string | null
  metadata?: Record<string, unknown>
  actor?: string
}

export interface UpdateAssetInput {
  name?: string
  description?: string | null
  status?: AssetStatus
  lifecycle_stage?: LifecycleStage
  owner?: string | null
  country?: string | null
  business_domain?: string | null
  metadata?: Record<string, unknown>
  actor?: string
}

export interface CreateRelationshipInput {
  source_global_id: string
  target_global_id: string
  relationship_type: string
  metadata?: Record<string, unknown>
  actor?: string
}

export interface ListAssetsQuery {
  assetType?: string
  status?: AssetStatus
  lifecycleStage?: LifecycleStage
  owner?: string
  businessDomain?: string
  country?: string
  includeArchived?: boolean
  page?: number
  pageSize?: number
  sortBy?: 'created_at' | 'updated_at' | 'name' | 'global_id'
  sortDir?: 'asc' | 'desc'
}

export interface SearchAssetsQuery extends ListAssetsQuery {
  q: string
}

export interface PaginatedResult<T> {
  data: T[]
  page: number
  pageSize: number
  total: number
}
