import { NextRequest, NextResponse } from 'next/server'
import { validateCreateAssetInput } from '@/lib/enterprise-assets/validation'
import { assetTypeExists } from '@/lib/enterprise-assets/repository'
import { errorResponse } from '@/lib/enterprise-assets/http'
import { verifyFoundationApiRequest } from '@/lib/enterprise-api-security/guard'

// Validates a prospective asset payload without creating anything — the
// same rules POST /api/enterprise-assets applies, exposed so callers can
// pre-flight-check a payload. Scoped as :read (not :write) despite being a
// POST — it never persists anything, and the scope is meant to reflect
// actual effect, not HTTP verb.
export async function POST(req: NextRequest) {
  const guard = await verifyFoundationApiRequest(req, 'enterprise-assets:read')
  if (!guard.ok) return guard.response

  const body = await req.json().catch(() => null)
  const result = validateCreateAssetInput(body)
  if (!result.valid || !result.data) {
    return NextResponse.json({ valid: false, errors: result.errors })
  }

  try {
    const typeExists = await assetTypeExists(result.data.asset_type_code)
    if (!typeExists) {
      return NextResponse.json({
        valid: false,
        errors: [`Unknown or inactive asset_type_code: ${result.data.asset_type_code}`],
      })
    }
    return NextResponse.json({ valid: true, errors: [] })
  } catch (error) {
    return errorResponse(error)
  }
}
