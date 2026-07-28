// EA-001 — pure validation functions. No DB access here (asset_type_code
// existence is a DB-backed check performed by the repository layer), so
// everything in this file is unit-testable in isolation.
import {
  ASSET_STATUSES, LIFECYCLE_STAGES, MAX_NAME_LENGTH, MAX_DESCRIPTION_LENGTH, MAX_TEXT_FIELD_LENGTH,
  MAX_RELATIONSHIP_TYPE_LENGTH, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, SORTABLE_FIELDS,
  COUNTRY_CODE_PATTERN,
} from './constants'
import type {
  AssetStatus, LifecycleStage, CreateAssetInput, UpdateAssetInput,
  CreateRelationshipInput, ListAssetsQuery, SearchAssetsQuery,
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

export function isValidStatus(v: unknown): v is AssetStatus {
  return typeof v === 'string' && (ASSET_STATUSES as string[]).includes(v)
}

export function isValidLifecycleStage(v: unknown): v is LifecycleStage {
  return typeof v === 'string' && (LIFECYCLE_STAGES as string[]).includes(v)
}

export function isValidCountryCode(v: unknown): boolean {
  return typeof v === 'string' && COUNTRY_CODE_PATTERN.test(v)
}

// MO-<PREFIX>-<6 digits>, e.g. MO-PROD-000001. Prefix length is not fixed
// since asset types (and their prefixes) are DB-driven, not a closed set.
export function isValidGlobalIdFormat(v: unknown): boolean {
  return typeof v === 'string' && /^MO-[A-Z]+-\d{6}$/.test(v)
}

export function validateCreateAssetInput(input: unknown): ValidationResult<CreateAssetInput> {
  const errors: string[] = []
  if (!isPlainObject(input)) return fail(['Request body must be a JSON object'])

  const {
    asset_type_code, name, description, status, lifecycle_stage,
    owner, country, business_domain, metadata, actor,
  } = input as Record<string, unknown>

  if (!isNonEmptyString(asset_type_code)) errors.push('asset_type_code is required')
  if (!isNonEmptyString(name)) errors.push('name is required')
  if (typeof name === 'string' && name.length > MAX_NAME_LENGTH) {
    errors.push(`name must be ${MAX_NAME_LENGTH} characters or fewer`)
  }
  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') errors.push('description must be a string')
    else if (description.length > MAX_DESCRIPTION_LENGTH) {
      errors.push(`description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer`)
    }
  }
  if (status !== undefined && !isValidStatus(status)) {
    errors.push(`status must be one of: ${ASSET_STATUSES.join(', ')}`)
  }
  if (lifecycle_stage !== undefined && !isValidLifecycleStage(lifecycle_stage)) {
    errors.push(`lifecycle_stage must be one of: ${LIFECYCLE_STAGES.join(', ')}`)
  }
  for (const [key, val] of [['owner', owner], ['business_domain', business_domain]] as const) {
    if (val !== undefined && val !== null) {
      if (typeof val !== 'string') errors.push(`${key} must be a string`)
      else if (val.length > MAX_TEXT_FIELD_LENGTH) errors.push(`${key} must be ${MAX_TEXT_FIELD_LENGTH} characters or fewer`)
    }
  }
  if (country !== undefined && country !== null && !isValidCountryCode(country)) {
    errors.push('country must be a 2-letter ISO 3166-1 alpha-2 code (e.g. "GB")')
  }
  if (metadata !== undefined && !isPlainObject(metadata)) {
    errors.push('metadata must be a JSON object')
  }
  if (actor !== undefined && !isNonEmptyString(actor)) {
    errors.push('actor must be a non-empty string when provided')
  }

  if (errors.length > 0) return fail(errors)

  return ok({
    asset_type_code: (asset_type_code as string).trim(),
    name: (name as string).trim(),
    description: (description as string | null | undefined) ?? null,
    status: status as AssetStatus | undefined,
    lifecycle_stage: lifecycle_stage as LifecycleStage | undefined,
    owner: (owner as string | null | undefined) ?? null,
    country: (country as string | null | undefined) ?? null,
    business_domain: (business_domain as string | null | undefined) ?? null,
    metadata: (metadata as Record<string, unknown> | undefined) ?? {},
    actor: actor as string | undefined,
  })
}

export function validateUpdateAssetInput(input: unknown): ValidationResult<UpdateAssetInput> {
  const errors: string[] = []
  if (!isPlainObject(input)) return fail(['Request body must be a JSON object'])

  const {
    name, description, status, lifecycle_stage,
    owner, country, business_domain, metadata, actor,
  } = input as Record<string, unknown>

  const hasAnyField = [name, description, status, lifecycle_stage, owner, country, business_domain, metadata]
    .some((v) => v !== undefined)
  if (!hasAnyField) errors.push('At least one updatable field must be provided')

  if (name !== undefined) {
    if (!isNonEmptyString(name)) errors.push('name must be a non-empty string')
    else if (name.length > MAX_NAME_LENGTH) errors.push(`name must be ${MAX_NAME_LENGTH} characters or fewer`)
  }
  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') errors.push('description must be a string')
    else if (description.length > MAX_DESCRIPTION_LENGTH) {
      errors.push(`description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer`)
    }
  }
  if (status !== undefined && !isValidStatus(status)) {
    errors.push(`status must be one of: ${ASSET_STATUSES.join(', ')}`)
  }
  if (lifecycle_stage !== undefined && !isValidLifecycleStage(lifecycle_stage)) {
    errors.push(`lifecycle_stage must be one of: ${LIFECYCLE_STAGES.join(', ')}`)
  }
  for (const [key, val] of [['owner', owner], ['business_domain', business_domain]] as const) {
    if (val !== undefined && val !== null) {
      if (typeof val !== 'string') errors.push(`${key} must be a string`)
      else if (val.length > MAX_TEXT_FIELD_LENGTH) errors.push(`${key} must be ${MAX_TEXT_FIELD_LENGTH} characters or fewer`)
    }
  }
  if (country !== undefined && country !== null && !isValidCountryCode(country)) {
    errors.push('country must be a 2-letter ISO 3166-1 alpha-2 code (e.g. "GB")')
  }
  if (metadata !== undefined && !isPlainObject(metadata)) {
    errors.push('metadata must be a JSON object')
  }
  if (actor !== undefined && !isNonEmptyString(actor)) {
    errors.push('actor must be a non-empty string when provided')
  }

  if (errors.length > 0) return fail(errors)

  const data: UpdateAssetInput = {}
  if (name !== undefined) data.name = (name as string).trim()
  if (description !== undefined) data.description = description as string | null
  if (status !== undefined) data.status = status as AssetStatus
  if (lifecycle_stage !== undefined) data.lifecycle_stage = lifecycle_stage as LifecycleStage
  if (owner !== undefined) data.owner = owner as string | null
  if (country !== undefined) data.country = country as string | null
  if (business_domain !== undefined) data.business_domain = business_domain as string | null
  if (metadata !== undefined) data.metadata = metadata as Record<string, unknown>
  if (actor !== undefined) data.actor = actor as string

  return ok(data)
}

export function validateRelationshipInput(input: unknown): ValidationResult<CreateRelationshipInput> {
  const errors: string[] = []
  if (!isPlainObject(input)) return fail(['Request body must be a JSON object'])

  const { source_global_id, target_global_id, relationship_type, metadata, actor } = input as Record<string, unknown>

  if (!isValidGlobalIdFormat(source_global_id)) errors.push('source_global_id must be a valid asset global ID (e.g. MO-PROD-000001)')
  if (!isValidGlobalIdFormat(target_global_id)) errors.push('target_global_id must be a valid asset global ID (e.g. MO-PROD-000001)')
  if (isValidGlobalIdFormat(source_global_id) && isValidGlobalIdFormat(target_global_id) && source_global_id === target_global_id) {
    errors.push('source_global_id and target_global_id must not be the same asset')
  }
  if (!isNonEmptyString(relationship_type)) errors.push('relationship_type is required')
  else if ((relationship_type as string).length > MAX_RELATIONSHIP_TYPE_LENGTH) {
    errors.push(`relationship_type must be ${MAX_RELATIONSHIP_TYPE_LENGTH} characters or fewer`)
  }
  if (metadata !== undefined && !isPlainObject(metadata)) errors.push('metadata must be a JSON object')
  if (actor !== undefined && !isNonEmptyString(actor)) errors.push('actor must be a non-empty string when provided')

  if (errors.length > 0) return fail(errors)

  return ok({
    source_global_id: source_global_id as string,
    target_global_id: target_global_id as string,
    relationship_type: (relationship_type as string).trim(),
    metadata: (metadata as Record<string, unknown> | undefined) ?? {},
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

export function validateListQuery(params: URLSearchParams): ValidationResult<ListAssetsQuery> {
  const errors: string[] = []

  const status = params.get('status')
  if (status !== null && !isValidStatus(status)) errors.push(`status must be one of: ${ASSET_STATUSES.join(', ')}`)

  const lifecycleStage = params.get('lifecycleStage')
  if (lifecycleStage !== null && !isValidLifecycleStage(lifecycleStage)) {
    errors.push(`lifecycleStage must be one of: ${LIFECYCLE_STAGES.join(', ')}`)
  }

  const country = params.get('country')
  if (country !== null && !isValidCountryCode(country)) errors.push('country must be a 2-letter ISO 3166-1 alpha-2 code')

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
    assetType: params.get('assetType') ?? undefined,
    status: (status as AssetStatus | null) ?? undefined,
    lifecycleStage: (lifecycleStage as LifecycleStage | null) ?? undefined,
    owner: params.get('owner') ?? undefined,
    businessDomain: params.get('businessDomain') ?? undefined,
    country: country ?? undefined,
    includeArchived: params.get('includeArchived') === 'true',
    page: page.value,
    pageSize: pageSize.value,
    sortBy: (sortBy as ListAssetsQuery['sortBy']) ?? 'created_at',
    sortDir: (sortDir as 'asc' | 'desc') ?? 'desc',
  })
}

export function validateSearchQuery(params: URLSearchParams): ValidationResult<SearchAssetsQuery> {
  const q = params.get('q')
  if (!isNonEmptyString(q)) return fail(['q (search text) is required'])

  const listResult = validateListQuery(params)
  if (!listResult.valid || !listResult.data) return fail(listResult.errors)

  return ok({ ...listResult.data, q: q.trim() })
}
