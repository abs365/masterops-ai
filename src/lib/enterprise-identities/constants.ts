// EA-002 — shared constants for the Enterprise Identity Service.
import { IDENTITY_LIFECYCLE_STATES } from '@/types'

export { IDENTITY_LIFECYCLE_STATES }

export const MAX_DISPLAY_NAME_LENGTH = 200
export const MAX_DESCRIPTION_LENGTH = 2000
export const MAX_TEXT_FIELD_LENGTH = 500
export const MAX_BUSINESS_SCOPE_LENGTH = 100
export const MAX_CONTACT_EMAIL_LENGTH = 320

export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

export const SORTABLE_FIELDS = ['created_at', 'updated_at', 'display_name', 'global_id'] as const

// Deliberately permissive (RFC 5322 is far stricter than this needs to be
// for a display/contact field, not a delivery-critical mailbox check).
export const CONTACT_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
