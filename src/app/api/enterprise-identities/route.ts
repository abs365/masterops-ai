import { NextRequest, NextResponse } from 'next/server'
import { validateCreateIdentityInput, validateListQuery } from '@/lib/enterprise-identities/validation'
import { createIdentity, listIdentities, identityTypeExists } from '@/lib/enterprise-identities/repository'
import { errorResponse } from '@/lib/enterprise-identities/http'
import { verifyFoundationApiRequest } from '@/lib/enterprise-api-security/guard'

export async function GET(req: NextRequest) {
  const guard = await verifyFoundationApiRequest(req, 'enterprise-identities:read')
  if (!guard.ok) return guard.response

  const result = validateListQuery(req.nextUrl.searchParams)
  if (!result.valid || !result.data) {
    return NextResponse.json({ error: result.errors.join('; ') }, { status: 400 })
  }

  try {
    const page = await listIdentities(result.data)
    return NextResponse.json({ success: true, ...page })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(req: NextRequest) {
  const guard = await verifyFoundationApiRequest(req, 'enterprise-identities:write')
  if (!guard.ok) return guard.response

  const body = await req.json().catch(() => null)
  const result = validateCreateIdentityInput(body)
  if (!result.valid || !result.data) {
    return NextResponse.json({ error: result.errors.join('; ') }, { status: 400 })
  }

  try {
    const typeExists = await identityTypeExists(result.data.identity_type_code)
    if (!typeExists) {
      return NextResponse.json(
        { error: `Unknown or inactive identity_type_code: ${result.data.identity_type_code}` },
        { status: 400 }
      )
    }

    const identity = await createIdentity(result.data)
    return NextResponse.json({ success: true, data: identity }, { status: 201 })
  } catch (error) {
    return errorResponse(error)
  }
}
