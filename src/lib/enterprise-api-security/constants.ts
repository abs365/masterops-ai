// EA-003 — shared constants.
import type { ApiScope } from '@/types'

export const ALL_SCOPES: ApiScope[] = [
  'enterprise-assets:read',
  'enterprise-assets:write',
  'enterprise-identities:read',
  'enterprise-identities:write',
]

// Default per-credential ceiling, applied per minute. Implementation-time
// tuning value per EA-003_IMPLEMENTATION_READINESS.md Dependency Checklist
// item 5 — not a design-time decision, set conservatively here and adjustable
// without a schema change since it's not persisted per-credential in Phase 0.
export const DEFAULT_RATE_LIMIT_REQUESTS = 120
export const DEFAULT_RATE_LIMIT_WINDOW = '1 m'
export const RATE_LIMIT_KEY = 'foundation-api'
