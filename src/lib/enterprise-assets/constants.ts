// EA-001 — shared constants for the Enterprise Asset Registry.
import { ASSET_STATUSES, LIFECYCLE_STAGES } from '@/types'

export { ASSET_STATUSES, LIFECYCLE_STAGES }

// Relationship type is deliberately an open vocabulary (the spec does not
// enumerate one, unlike asset types) — these are commonly expected values
// used for guidance/documentation only, not enforced as a closed set.
export const SUGGESTED_RELATIONSHIP_TYPES = [
  'owns', 'part_of', 'depends_on', 'uses', 'related_to',
] as const

export const MAX_NAME_LENGTH = 200
export const MAX_DESCRIPTION_LENGTH = 2000
export const MAX_TEXT_FIELD_LENGTH = 500
export const MAX_RELATIONSHIP_TYPE_LENGTH = 100

export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

export const SORTABLE_FIELDS = ['created_at', 'updated_at', 'name', 'global_id'] as const

// ISO 3166-1 alpha-2, e.g. "GB", "US".
export const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/
