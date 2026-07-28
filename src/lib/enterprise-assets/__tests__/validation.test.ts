import { describe, it, expect } from 'vitest'
import {
  validateCreateAssetInput, validateUpdateAssetInput, validateRelationshipInput,
  validateListQuery, validateSearchQuery, isValidGlobalIdFormat, isValidCountryCode,
} from '../validation'

describe('validateCreateAssetInput', () => {
  it('accepts a minimal valid payload', () => {
    const result = validateCreateAssetInput({ asset_type_code: 'PRODUCT', name: 'ELBOLD' })
    expect(result.valid).toBe(true)
    expect(result.data).toMatchObject({ asset_type_code: 'PRODUCT', name: 'ELBOLD', metadata: {} })
  })

  it('rejects a non-object body', () => {
    expect(validateCreateAssetInput(null).valid).toBe(false)
    expect(validateCreateAssetInput('x').valid).toBe(false)
    expect(validateCreateAssetInput([]).valid).toBe(false)
  })

  it('requires asset_type_code and name', () => {
    const result = validateCreateAssetInput({})
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('asset_type_code is required')
    expect(result.errors).toContain('name is required')
  })

  it('rejects an invalid status', () => {
    const result = validateCreateAssetInput({ asset_type_code: 'PRODUCT', name: 'X', status: 'deleted' })
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toMatch(/status must be one of/)
  })

  it('rejects an invalid lifecycle_stage', () => {
    const result = validateCreateAssetInput({ asset_type_code: 'PRODUCT', name: 'X', lifecycle_stage: 'unknown' })
    expect(result.valid).toBe(false)
  })

  it('rejects metadata that is not a plain object', () => {
    const result = validateCreateAssetInput({ asset_type_code: 'PRODUCT', name: 'X', metadata: [1, 2] })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('metadata must be a JSON object')
  })

  it('rejects a non-2-letter country code', () => {
    const result = validateCreateAssetInput({ asset_type_code: 'PRODUCT', name: 'X', country: 'GBR' })
    expect(result.valid).toBe(false)
  })

  it('accepts a valid country code', () => {
    const result = validateCreateAssetInput({ asset_type_code: 'PRODUCT', name: 'X', country: 'GB' })
    expect(result.valid).toBe(true)
  })

  it('trims name and asset_type_code', () => {
    const result = validateCreateAssetInput({ asset_type_code: ' PRODUCT ', name: '  X  ' })
    expect(result.data).toMatchObject({ asset_type_code: 'PRODUCT', name: 'X' })
  })

  it('rejects a description over the max length', () => {
    const result = validateCreateAssetInput({ asset_type_code: 'PRODUCT', name: 'X', description: 'a'.repeat(2001) })
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toMatch(/description must be 2000 characters or fewer/)
  })

  it('accepts a description at exactly the max length', () => {
    const result = validateCreateAssetInput({ asset_type_code: 'PRODUCT', name: 'X', description: 'a'.repeat(2000) })
    expect(result.valid).toBe(true)
  })
})

describe('validateUpdateAssetInput', () => {
  it('requires at least one field', () => {
    const result = validateUpdateAssetInput({})
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('At least one updatable field must be provided')
  })

  it('accepts a partial patch', () => {
    const result = validateUpdateAssetInput({ owner: 'Founder' })
    expect(result.valid).toBe(true)
    expect(result.data).toEqual({ owner: 'Founder' })
  })

  it('allows explicitly nulling out a nullable field', () => {
    const result = validateUpdateAssetInput({ owner: null })
    expect(result.valid).toBe(true)
    expect(result.data).toEqual({ owner: null })
  })

  it('rejects an empty name', () => {
    const result = validateUpdateAssetInput({ name: '   ' })
    expect(result.valid).toBe(false)
  })
})

describe('validateRelationshipInput', () => {
  it('accepts a valid relationship', () => {
    const result = validateRelationshipInput({
      source_global_id: 'MO-PROD-000001',
      target_global_id: 'MO-SVC-000001',
      relationship_type: 'depends_on',
    })
    expect(result.valid).toBe(true)
  })

  it('rejects malformed global IDs', () => {
    const result = validateRelationshipInput({
      source_global_id: 'not-an-id',
      target_global_id: 'MO-SVC-000001',
      relationship_type: 'depends_on',
    })
    expect(result.valid).toBe(false)
  })

  it('rejects a self-relationship', () => {
    const result = validateRelationshipInput({
      source_global_id: 'MO-PROD-000001',
      target_global_id: 'MO-PROD-000001',
      relationship_type: 'depends_on',
    })
    expect(result.valid).toBe(false)
    expect(result.errors.join(' ')).toMatch(/must not be the same asset/)
  })

  it('requires relationship_type', () => {
    const result = validateRelationshipInput({
      source_global_id: 'MO-PROD-000001',
      target_global_id: 'MO-SVC-000001',
    })
    expect(result.valid).toBe(false)
  })
})

describe('validateListQuery / validateSearchQuery', () => {
  it('applies defaults when no params given', () => {
    const result = validateListQuery(new URLSearchParams())
    expect(result.valid).toBe(true)
    expect(result.data).toMatchObject({ page: 1, pageSize: 20, sortBy: 'created_at', sortDir: 'desc' })
  })

  it('rejects an out-of-range page', () => {
    const result = validateListQuery(new URLSearchParams('page=0'))
    expect(result.valid).toBe(false)
  })

  it('caps pageSize at the maximum', () => {
    const result = validateListQuery(new URLSearchParams('pageSize=500'))
    expect(result.valid).toBe(false)
  })

  it('rejects an invalid sortBy', () => {
    const result = validateListQuery(new URLSearchParams('sortBy=secret_field'))
    expect(result.valid).toBe(false)
  })

  it('search requires q', () => {
    const result = validateSearchQuery(new URLSearchParams())
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('q (search text) is required')
  })

  it('search accepts q plus list filters', () => {
    const result = validateSearchQuery(new URLSearchParams('q=elbold&status=active'))
    expect(result.valid).toBe(true)
    expect(result.data).toMatchObject({ q: 'elbold', status: 'active' })
  })
})

describe('format helpers', () => {
  it('isValidGlobalIdFormat', () => {
    expect(isValidGlobalIdFormat('MO-PROD-000001')).toBe(true)
    expect(isValidGlobalIdFormat('MO-KA-000042')).toBe(true)
    expect(isValidGlobalIdFormat('mo-prod-000001')).toBe(false)
    expect(isValidGlobalIdFormat('MO-PROD-1')).toBe(false)
    expect(isValidGlobalIdFormat('random')).toBe(false)
  })

  it('isValidCountryCode', () => {
    expect(isValidCountryCode('GB')).toBe(true)
    expect(isValidCountryCode('gb')).toBe(false)
    expect(isValidCountryCode('GBR')).toBe(false)
  })
})
