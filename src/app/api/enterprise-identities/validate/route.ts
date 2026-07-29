import { NextRequest, NextResponse } from 'next/server'
import { validateCreateIdentityInput } from '@/lib/enterprise-identities/validation'
import { identityTypeExists } from '@/lib/enterprise-identities/repository'
import { errorResponse } from '@/lib/enterprise-identities/http'
import { verifyFoundationApiRequest } from '@/lib/enterprise-api-security/guard'

// Validates a prospective identity payload without creating anything — same
// rules POST /api/enterprise-identities applies. Mirrors EA-001's Validate
// Asset endpoint. Scoped :read, not :write — non-mutating despite being POST.
export async function POST(req: NextRequest) {
  const guard = await verifyFoundationApiRequest(req, 'enterprise-identities:read')
  if (!guard.ok) return guard.response

  const body = await req.json().catch(() => null)
  const result = validateCreateIdentityInput(body)
  if (!result.valid || !result.data) {
    return NextResponse.json({ valid: false, errors: result.errors })
  }

  try {
    const typeExists = await identityTypeExists(result.data.identity_type_code)
    if (!typeExists) {
      return NextResponse.json({
        valid: false,
        errors: [`Unknown or inactive identity_type_code: ${result.data.identity_type_code}`],
      })
    }
    return NextResponse.json({ valid: true, errors: [] })
  } catch (error) {
    return errorResponse(error)
  }
}
