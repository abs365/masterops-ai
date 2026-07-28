// EA-002 — shared API route helpers, kept out of the route files so error
// mapping stays identical across every endpoint. Mirrors EA-001's http.ts.
import { NextResponse } from 'next/server'
import { IdentityNotFoundError, UnknownIdentityTypeError, InvalidLifecycleTransitionError } from './repository'
import { AssetNotFoundError } from '@/lib/enterprise-assets/repository'

export function errorResponse(error: unknown): NextResponse {
  if (error instanceof IdentityNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }
  // A link-asset call whose target EA-001 asset doesn't exist is a client
  // input error (bad asset_global_id), not a 500 — same class as
  // UnknownIdentityTypeError below.
  if (error instanceof AssetNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  if (error instanceof UnknownIdentityTypeError) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  if (error instanceof InvalidLifecycleTransitionError) {
    return NextResponse.json({ error: error.message }, { status: 409 })
  }
  const message = error instanceof Error ? error.message : 'Unexpected error'
  return NextResponse.json({ error: message }, { status: 500 })
}
