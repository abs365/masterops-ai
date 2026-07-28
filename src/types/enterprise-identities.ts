// EA-002 Enterprise Identity Service — types (Phase 1 only).
// Identity TYPE is intentionally not a closed union: the DB lookup table
// (enterprise_identity_types) is the source of truth, mirroring EA-001's
// AssetTypeCode convention. GROUP is deliberately not included (Design Spec
// Open Question 1; Founder Decision 2026-07-28: deferred, do not implement).
export type IdentityTypeCode = string

// Own vocabulary, not a reuse of EA-001's LifecycleStage (ADR-002 decision 2).
export type IdentityLifecycleState = 'provisioned' | 'active' | 'suspended' | 'deactivated' | 'archived'

export const IDENTITY_LIFECYCLE_STATES: IdentityLifecycleState[] = [
  'provisioned', 'active', 'suspended', 'deactivated', 'archived',
]

export type IdentityAuditAction =
  | 'IdentityCreated'
  | 'IdentityUpdated'
  | 'IdentityActivated'
  | 'IdentitySuspended'
  | 'IdentityReactivated'
  | 'IdentityDeactivated'
  | 'IdentityArchived'
  | 'IdentityLinkedToAsset'
  | 'IdentityUnlinkedFromAsset'

export type IdentityEventType = IdentityAuditAction

export interface EnterpriseIdentityType {
  code: string
  prefix: string
  label: string
  description: string | null
  active: boolean
  created_at: string
}

export interface EnterpriseIdentity {
  id: string
  global_id: string
  identity_type_code: string
  display_name: string
  description: string | null
  lifecycle_state: IdentityLifecycleState
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

export interface EnterpriseIdentityAuditRecord {
  id: string
  identity_id: string | null
  action: IdentityAuditAction
  actor: string
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  occurred_at: string
}

export interface EnterpriseIdentityEvent {
  id: string
  event_type: IdentityEventType
  identity_id: string | null
  payload: Record<string, unknown>
  occurred_at: string
  consumed_at: string | null
}

export interface CreateIdentityInput {
  identity_type_code: string
  display_name: string
  description?: string | null
  owner?: string | null
  business_scope?: string | null
  contact_email?: string | null
  metadata?: Record<string, unknown>
  actor?: string
}

export interface UpdateIdentityInput {
  display_name?: string
  description?: string | null
  owner?: string | null
  business_scope?: string | null
  contact_email?: string | null
  metadata?: Record<string, unknown>
  actor?: string
}

export interface LinkIdentityAssetInput {
  asset_global_id: string
  actor?: string
}

export interface ListIdentitiesQuery {
  identityType?: string
  lifecycleState?: IdentityLifecycleState
  owner?: string
  businessScope?: string
  page?: number
  pageSize?: number
  sortBy?: 'created_at' | 'updated_at' | 'display_name' | 'global_id'
  sortDir?: 'asc' | 'desc'
}

export interface SearchIdentitiesQuery extends ListIdentitiesQuery {
  q: string
}

// Reuses EA-001's PaginatedResult<T> (types/enterprise-assets.ts) rather than
// redefining an identical shape — no functional difference between the two
// capabilities' pagination envelope.
