import { describe, it, expect } from 'vitest'
import {
  validateCreateIdentityInput, validateUpdateIdentityInput, validateLinkAssetInput,
  validateListQuery, validateSearchQuery, isValidGlobalIdFormat, isValidAssetGlobalIdFormat,
  isValidContactEmail,
} from '../validation'

describe('validateCreateIdentityInput', () => {
  it('accepts a minimal valid payload', () => {
    const result = validateCreateIdentityInput({ identity_type_code: 'PERSON', display_name: 'Founder' })
    expect(result.valid).toBe(true)
    expect(result.data).toMatchObject({ identity_type_code: 'PERSON', display_name: 'Founder', metadata: {} })
  })

  it('rejects a non-object body', () => {
    expect(validateCreateIdentityInput(null).valid).toBe(false)
    expect(validateCreateIdentityInput('x').valid).toBe(false)
    expect(validateCreateIdentityInput([]).valid).toBe(false)
  })

  it('requires identity_type_code and display_name', () => {
    const result = validateCreateIdentityInput({})
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('identity_type_code is required')
    expect(result.errors).toContain('display_name is required')
  })

  it('rejects metadata that is not a plain object', () => {
    const result = validateCreateIdentityInput({ identity_type_code: 'PERSON', display_name: 'X', metadata: [1, 2] })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('metadata must be a JSON object')
  })

  it('rejects a malformed contact_email', () => {
    const result = validateCreateIdentityInput({ identity_type_code: 'PERSON', display_name: 'X', contact_email: 'not-an-email' })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('contact_email must be a valid email address')
  })

  it('accepts a valid contact_email', () => {
    const result = validateCreateIdentityInput({ identity_type_code: 'PERSON', display_name: 'X', contact_email: 'founder@example.com' })
    expect(result.valid).toBe(true)
  })

  it('rejects a display_name over the length cap', () => {
    const result = validateCreateIdentityInput({ identity_type_code: 'PERSON', display_name: 'x'.repeat(201) })
    expect(result.valid).toBe(false)
  })
})

describe('validateUpdateIdentityInput', () => {
  it('requires at least one field', () => {
    const result = validateUpdateIdentityInput({})
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('At least one updatable field must be provided')
  })

  it('accepts a partial patch', () => {
    const result = validateUpdateIdentityInput({ description: 'Enterprise operator' })
    expect(result.valid).toBe(true)
    expect(result.data).toEqual({ description: 'Enterprise operator' })
  })

  it('does not require identity_type_code (not updatable)', () => {
    const result = validateUpdateIdentityInput({ display_name: 'New Name' })
    expect(result.valid).toBe(true)
  })
})

describe('validateLinkAssetInput', () => {
  it('accepts a valid EA-001 asset global ID', () => {
    const result = validateLinkAssetInput({ asset_global_id: 'MO-AUTO-000001' })
    expect(result.valid).toBe(true)
  })

  it('rejects a malformed or missing asset_global_id', () => {
    expect(validateLinkAssetInput({}).valid).toBe(false)
    expect(validateLinkAssetInput({ asset_global_id: 'not-a-global-id' }).valid).toBe(false)
    expect(validateLinkAssetInput({ asset_global_id: 'ID-PERSON-000001' }).valid).toBe(false) // an Identity ID, not an Asset ID
  })
})

describe('global ID format helpers', () => {
  it('isValidGlobalIdFormat accepts ID- prefixed identity IDs only', () => {
    expect(isValidGlobalIdFormat('ID-PERSON-000001')).toBe(true)
    expect(isValidGlobalIdFormat('MO-PROD-000001')).toBe(false)
    expect(isValidGlobalIdFormat('not-an-id')).toBe(false)
  })

  it('isValidAssetGlobalIdFormat accepts MO- prefixed asset IDs only', () => {
    expect(isValidAssetGlobalIdFormat('MO-AUTO-000001')).toBe(true)
    expect(isValidAssetGlobalIdFormat('ID-PERSON-000001')).toBe(false)
  })

  it('isValidContactEmail rejects obviously malformed input', () => {
    expect(isValidContactEmail('a@b.com')).toBe(true)
    expect(isValidContactEmail('a@b')).toBe(false)
    expect(isValidContactEmail('not-an-email')).toBe(false)
  })
})

describe('validateListQuery / validateSearchQuery', () => {
  it('defaults page/pageSize/sort when absent', () => {
    const result = validateListQuery(new URLSearchParams())
    expect(result.valid).toBe(true)
    expect(result.data).toMatchObject({ page: 1, pageSize: 20, sortBy: 'created_at', sortDir: 'desc' })
  })

  it('rejects an invalid lifecycleState', () => {
    const result = validateListQuery(new URLSearchParams({ lifecycleState: 'not-a-state' }))
    expect(result.valid).toBe(false)
  })

  it('requires q for search', () => {
    const result = validateSearchQuery(new URLSearchParams())
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('q (search text) is required')
  })
})
