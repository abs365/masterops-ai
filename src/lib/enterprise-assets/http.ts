// EA-001 — shared API route helpers, kept out of the route files so error
// mapping stays identical across every endpoint.
import { NextResponse } from 'next/server'
import { AssetNotFoundError, UnknownAssetTypeError } from './repository'

export function errorResponse(error: unknown): NextResponse {
  if (error instanceof AssetNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }
  if (error instanceof UnknownAssetTypeError) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  const message = error instanceof Error ? error.message : 'Unexpected error'
  return NextResponse.json({ error: message }, { status: 500 })
}
