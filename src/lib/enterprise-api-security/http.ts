// EA-003 — shared HTTP error responses. Deliberately generic for every
// authentication-class failure (missing/malformed/unknown/wrong-secret/
// revoked/expired credential, inactive identity) — the *specific* reason is
// recorded in the request-audit log (server-side only), never in the
// response body, so an external caller cannot use a distinguishable error
// message to probe which part of a guess was wrong (an enumeration oracle).
// Authorization failures (wrong scope) are a different class — the caller
// already authenticated successfully, so naming "insufficient scope" reveals
// nothing exploitable.
import { NextResponse } from 'next/server'

export function unauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: 'Invalid or expired credential' }, { status: 401 })
}

export function forbiddenResponse(): NextResponse {
  return NextResponse.json({ error: 'Credential does not have the required scope for this operation' }, { status: 403 })
}

export function rateLimitedResponse(): NextResponse {
  return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
}

export function serviceUnavailableResponse(): NextResponse {
  return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 })
}
