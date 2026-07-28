// EA-002 — pure validation functions. No DB access here (identity_type_code
// existence is a DB-backed check performed by the repository layer), same
// separation of concerns as EA-001's validation.ts.
import {
  IDENTITY_LIFECYCLE_STATES, MAX_DISPLAY_NAME_LENGTH, MAX_DESCRIPTION_LENGTH, MAX_TEXT_FIELD_LENGTH,
  MAX_BUSINESS_SCOPE_LENGTH, MAX_CONTACT_EMAIL_LENGTH, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, SORTABLE_FIELDS,
  CONTACT_EMAIL_PATTERN,
} from './constants'
import type {
  IdentityLifecycleState, CreateIdentityInput, UpdateIdentityInput,
  LinkIdentityAssetInput, ListIdentitiesQuery, SearchIdentitiesQuery,
} from '@/types'

export interface ValidationResult<T> {
  valid: boolean
  errors: string[]
  data: T | null
}

function ok<T>(data: T): ValidationResult<T> {
  return { valid: true, errors: [], data }
}

function fail<T>(errors: string[]): ValidationResult<T> {
  return { valid: false, errors, data: null }
}

export function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

export function isValidLifecycleState(v: unknown): v is IdentityLifecycleState {
  return typeof v === 'string' && (IDENTITY_LIFECYCLE_STATES as string[]).includes(v)
}

export function isValidContactEmail(v: unknown): boolean {
  return typeof v === 'string' && CONTACT_EMAIL_PATTERN.test(v)
}

// ID-<PREFIX>-<6 digits>, e.g. ID-PERSON-000001. Prefix length is not fixed
// since identity types (and their prefixes) are DB-driven, mirrors EA-001's
// isValidGlobalIdFormat but with the approved 'ID-' root (Founder Decision
// 2026-07-28) instead of EA-001's 'MO-'.
export function isValidGlobalIdFormat(v: unknown): boolean {
  return typeof v === 'string' && /^ID-[A-Z]+-\d{6}$/.test(v)
}

// EA-001's own asset global ID format — used to validate the target of a
// link-asset request before it's passed on to EA-001's own repository.
export function isValidAssetGlobalIdFormat(v: unknown): boolean {
  return typeof v === 'string' && /^MO-[A-Z]+-\d{6}$/.test(v)
}

export function validateCreateIdentityInput(input: unknown): ValidationResult<CreateIdentityInput> {
  const errors: string[] = []
  if (!isPlainObject(input)) return fail(['Request body must be a JSON object'])

  const {
    identity_type_code, display_name, description,
    owner, business_scope, contact_email, metadata, actor,
  } = input as Record<string, unknown>

  if (!isNonEmptyString(identity_type_code)) errors.push('identity_type_code is required')
  if (!isNonEmptyString(display_name)) errors.push('display_name is required')
  if (typeof display_name === 'string' && display_name.length > MAX_DISPLAY_NAME_LENGTH) {
    errors.push(`display_name must be ${MAX_DISPLAY_NAME_LENGTH} characters or fewer`)
  }
  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') errors.push('description must be a string')
    else if (description.length > MAX_DESCRIPTION_LENGTH) {
      errors.push(`description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer`)
    }
  }
  if (owner !== undefined && owner !== null) {
    if (typeof owner !== 'string') errors.push('owner must be a string')
    else if (owner.length > MAX_TEXT_FIELD_LENGTH) errors.push(`owner must be ${MAX_TEXT_FIELD_LENGTH} characters or fewer`)
  }
  if (business_scope !== undefined && business_scope !== null) {
    if (typeof business_scope !== 'string') errors.push('business_scope must be a string')
    else if (business_scope.length > MAX_BUSINESS_SCOPE_LENGTH) {
      errors.push(`business_scope must be ${MAX_BUSINESS_SCOPE_LENGTH} characters or fewer`)
    }
  }
  if (contact_email !== undefined && contact_email !== null) {
    if (typeof contact_email !== 'string' || !isValidContactEmail(contact_email)) {
      errors.push('contact_email must be a valid email address')
    } else if (contact_email.length > MAX_CONTACT_EMAIL_LENGTH) {
      errors.push(`contact_email must be ${MAX_CONTACT_EMAIL_LENGTH} characters or fewer`)
    }
  }
  if (metadata !== undefined && !isPlainObject(metadata)) {
    errors.push('metadata must be a JSON object')
  }
  if (actor !== undefined && !isNonEmptyString(actor)) {
    errors.push('actor must be a non-empty string when provided')
  }

  if (errors.length > 0) return fail(errors)

  return ok({
    identity_type_code: (identity_type_code as string).trim(),
    display_name: (display_name as string).trim(),
    description: (description as string | null | undefined) ?? null,
    owner: (owner as string | null | undefined) ?? null,
    business_scope: (business_scope as string | null | undefined) ?? null,
    contact_email: (contact_email as string | null | undefined) ?? null,
    metadata: (metadata as Record<string, unknown> | undefined) ?? {},
    actor: actor as string | undefined,
  })
}

export function validateUpdateIdentityInput(input: unknown): ValidationResult<UpdateIdentityInput> {
  const errors: string[] = []
  if (!isPlainObject(input)) return fail(['Request body must be a JSON object'])

  const { display_name, description, owner, business_scope, contact_email, metadata, actor } = input as Record<string, unknown>

  const hasAnyField = [display_name, description, owner, business_scope, contact_email, metadata]
    .some((v) => v !== undefined)
  if (!hasAnyField) errors.push('At least one updatable field must be provided')

  if (display_name !== undefined) {
    if (!isNonEmptyString(display_name)) errors.push('display_name must be a non-empty string')
    else if (display_name.length > MAX_DISPLAY_NAME_LENGTH) {
      errors.push(`display_name must be ${MAX_DISPLAY_NAME_LENGTH} characters or fewer`)
    }
  }
  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') errors.push('description must be a string')
    else if (description.length > MAX_DESCRIPTION_LENGTH) {
      errors.push(`description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer`)
    }
  }
  if (owner !== undefined && owner !== null) {
    if (typeof owner !== 'string') errors.push('owner must be a string')
    else if (owner.length > MAX_TEXT_FIELD_LENGTH) errors.push(`owner must be ${MAX_TEXT_FIELD_LENGTH} characters or fewer`)
  }
  if (business_scope !== undefined && business_scope !== null) {
    if (typeof business_scope !== 'string') errors.push('business_scope must be a string')
    else if (business_scope.length > MAX_BUSINESS_SCOPE_LENGTH) {
      errors.push(`business_scope must be ${MAX_BUSINESS_SCOPE_LENGTH} characters or fewer`)
    }
  }
  if (contact_email !== undefined && contact_email !== null) {
    if (typeof contact_email !== 'string' || !isValidContactEmail(contact_email)) {
      errors.push('contact_email must be a valid email address')
    } else if (contact_email.length > MAX_CONTACT_EMAIL_LENGTH) {
      errors.push(`contact_email must be ${MAX_CONTACT_EMAIL_LENGTH} characters or fewer`)
    }
  }
  if (metadata !== undefined && !isPlainObject(metadata)) {
    errors.push('metadata must be a JSON object')
  }
  if (actor !== undefined && !isNonEmptyString(actor)) {
    errors.push('actor must be a non-empty string when provided')
  }

  if (errors.length > 0) return fail(errors)

  const data: UpdateIdentityInput = {}
  if (display_name !== undefined) data.display_name = (display_name as string).trim()
  if (description !== undefined) data.description = description as string | null
  if (owner !== undefined) data.owner = owner as string | null
  if (business_scope !== undefined) data.business_scope = business_scope as string | null
  if (contact_email !== undefined) data.contact_email = contact_email as string | null
  if (metadata !== undefined) data.metadata = metadata as Record<string, unknown>
  if (actor !== undefined) data.actor = actor as string

  return ok(data)
}

export function validateLinkAssetInput(input: unknown): ValidationResult<LinkIdentityAssetInput> {
  const errors: string[] = []
  if (!isPlainObject(input)) return fail(['Request body must be a JSON object'])

  const { asset_global_id, actor } = input as Record<string, unknown>

  if (!isValidAssetGlobalIdFormat(asset_global_id)) {
    errors.push('asset_global_id must be a valid EA-001 asset global ID (e.g. MO-AUTO-000001)')
  }
  if (actor !== undefined && !isNonEmptyString(actor)) errors.push('actor must be a non-empty string when provided')

  if (errors.length > 0) return fail(errors)

  return ok({
    asset_global_id: asset_global_id as string,
    actor: actor as string | undefined,
  })
}

function parsePageParam(raw: string | null, fallback: number, max?: number): { value: number; error: string | null } {
  if (raw === null) return { value: fallback, error: null }
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 1) return { value: fallback, error: 'must be a positive integer' }
  if (max !== undefined && n > max) return { value: max, error: `must be ${max} or fewer` }
  return { value: n, error: null }
}

export function validateListQuery(params: URLSearchParams): ValidationResult<ListIdentitiesQuery> {
  const errors: string[] = []

  const lifecycleState = params.get('lifecycleState')
  if (lifecycleState !== null && !isValidLifecycleState(lifecycleState)) {
    errors.push(`lifecycleState must be one of: ${IDENTITY_LIFECYCLE_STATES.join(', ')}`)
  }

  const page = parsePageParam(params.get('page'), 1)
  if (page.error) errors.push(`page ${page.error}`)

  const pageSize = parsePageParam(params.get('pageSize'), DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)
  if (pageSize.error) errors.push(`pageSize ${pageSize.error}`)

  const sortBy = params.get('sortBy')
  if (sortBy !== null && !(SORTABLE_FIELDS as readonly string[]).includes(sortBy)) {
    errors.push(`sortBy must be one of: ${SORTABLE_FIELDS.join(', ')}`)
  }

  const sortDir = params.get('sortDir')
  if (sortDir !== null && sortDir !== 'asc' && sortDir !== 'desc') errors.push('sortDir must be "asc" or "desc"')

  if (errors.length > 0) return fail(errors)

  return ok({
    identityType: params.get('identityType') ?? undefined,
    lifecycleState: (lifecycleState as IdentityLifecycleState | null) ?? undefined,
    owner: params.get('owner') ?? undefined,
    businessScope: params.get('businessScope') ?? undefined,
    page: page.value,
    pageSize: pageSize.value,
    sortBy: (sortBy as ListIdentitiesQuery['sortBy']) ?? 'created_at',
    sortDir: (sortDir as 'asc' | 'desc') ?? 'desc',
  })
}

export function validateSearchQuery(params: URLSearchParams): ValidationResult<SearchIdentitiesQuery> {
  const q = params.get('q')
  if (!isNonEmptyString(q)) return fail(['q (search text) is required'])

  const listResult = validateListQuery(params)
  if (!listResult.valid || !listResult.data) return fail(listResult.errors)

  return ok({ ...listResult.data, q: q.trim() })
}
