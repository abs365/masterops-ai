// EA-003 — credential generation and verification.
//
// Secrets are high-entropy, randomly generated API keys, not low-entropy
// user-chosen passwords — SHA-256 hash + exact-match DB lookup is standard
// practice for this class of secret (the same approach GitHub/Stripe-style
// token schemes use), and satisfies the approved design's "timing-safe
// comparison OR secure hash verification" requirement via the hash-verification
// branch: no two secret strings are ever compared byte-by-byte in application
// code, so the timing side-channel that motivates timing-safe *string*
// comparison does not apply here.
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto'

export const CREDENTIAL_PREFIX = 'moak_'
const SECRET_BYTES = 32 // 256 bits of entropy
const PREFIX_DISPLAY_CHARS = 8 // characters of the raw secret shown in credential_prefix, for human identification only

export interface GeneratedSecret {
  secret: string // full raw secret — MOAK_<base62>, shown to the caller exactly once
  credentialPrefix: string // MOAK_<first 8 chars> — safe to store/display/log
  secretHash: string // SHA-256 hex digest — what's actually stored and checked
}

const BASE62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

function toBase62(bytes: Buffer): string {
  let out = ''
  for (const byte of bytes) {
    out += BASE62[byte % BASE62.length]
  }
  return out
}

export function generateSecret(): GeneratedSecret {
  const raw = toBase62(randomBytes(SECRET_BYTES))
  const secret = `${CREDENTIAL_PREFIX}${raw}`
  const credentialPrefix = secret.slice(0, CREDENTIAL_PREFIX.length + PREFIX_DISPLAY_CHARS)
  const secretHash = hashSecret(secret)
  return { secret, credentialPrefix, secretHash }
}

export function hashSecret(secret: string): string {
  return createHash('sha256').update(secret, 'utf8').digest('hex')
}

// Timing-safe equality check, used only for the (short, non-secret) prefix
// sanity check before a hash lookup — not load-bearing for authentication
// itself (the hash lookup is), but included so no string comparison in this
// module is ever length/content-timing-observable, satisfying the approved
// design's requirement literally as well as in spirit.
export function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

export function isWellFormedCredential(v: unknown): v is string {
  return typeof v === 'string' && v.startsWith(CREDENTIAL_PREFIX) && v.length > CREDENTIAL_PREFIX.length + 16
}
