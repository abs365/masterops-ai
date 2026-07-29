import { describe, it, expect } from 'vitest'
import { generateSecret, hashSecret, timingSafeStringEqual, isWellFormedCredential, CREDENTIAL_PREFIX } from '../crypto'

describe('generateSecret', () => {
  it('produces a secret with the expected prefix and sufficient length', () => {
    const { secret } = generateSecret()
    expect(secret.startsWith(CREDENTIAL_PREFIX)).toBe(true)
    expect(secret.length).toBeGreaterThan(32)
  })

  it('produces a distinct secret on every call', () => {
    const a = generateSecret()
    const b = generateSecret()
    expect(a.secret).not.toBe(b.secret)
    expect(a.secretHash).not.toBe(b.secretHash)
  })

  it('the credentialPrefix is a true prefix of the full secret, and shorter than it', () => {
    const { secret, credentialPrefix } = generateSecret()
    expect(secret.startsWith(credentialPrefix)).toBe(true)
    expect(credentialPrefix.length).toBeLessThan(secret.length)
  })

  it('the returned secretHash matches hashSecret(secret) independently', () => {
    const { secret, secretHash } = generateSecret()
    expect(hashSecret(secret)).toBe(secretHash)
  })

  it('never includes the raw secret anywhere but the .secret field (redaction sanity check)', () => {
    const generated = generateSecret()
    const serialized = JSON.stringify({ credentialPrefix: generated.credentialPrefix, secretHash: generated.secretHash })
    expect(serialized).not.toContain(generated.secret)
  })
})

describe('hashSecret', () => {
  it('is deterministic', () => {
    expect(hashSecret('moak_example')).toBe(hashSecret('moak_example'))
  })

  it('produces different hashes for different inputs', () => {
    expect(hashSecret('moak_a')).not.toBe(hashSecret('moak_b'))
  })

  it('produces a 64-character hex digest (SHA-256)', () => {
    expect(hashSecret('moak_example')).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe('timingSafeStringEqual', () => {
  it('returns true for equal strings', () => {
    expect(timingSafeStringEqual('abc', 'abc')).toBe(true)
  })

  it('returns false for different strings of the same length', () => {
    expect(timingSafeStringEqual('abc', 'abd')).toBe(false)
  })

  it('returns false for different-length strings without throwing', () => {
    expect(timingSafeStringEqual('abc', 'abcd')).toBe(false)
  })
})

describe('isWellFormedCredential', () => {
  it('accepts a real generated secret', () => {
    const { secret } = generateSecret()
    expect(isWellFormedCredential(secret)).toBe(true)
  })

  it('rejects a value without the expected prefix', () => {
    expect(isWellFormedCredential('not_a_credential_1234567890')).toBe(false)
  })

  it('rejects a too-short value even with the correct prefix', () => {
    expect(isWellFormedCredential('moak_short')).toBe(false)
  })

  it('rejects non-string input', () => {
    expect(isWellFormedCredential(undefined)).toBe(false)
    expect(isWellFormedCredential(12345)).toBe(false)
    expect(isWellFormedCredential(null)).toBe(false)
  })
})
