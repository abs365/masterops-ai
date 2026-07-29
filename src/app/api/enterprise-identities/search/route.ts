import { NextRequest, NextResponse } from 'next/server'
import { validateSearchQuery } from '@/lib/enterprise-identities/validation'
import { searchIdentities } from '@/lib/enterprise-identities/repository'
import { errorResponse } from '@/lib/enterprise-identities/http'
import { verifyFoundationApiRequest } from '@/lib/enterprise-api-security/guard'

export async function GET(req: NextRequest) {
  const guard = await verifyFoundationApiRequest(req, 'enterprise-identities:read')
  if (!guard.ok) return guard.response

  const result = validateSearchQuery(req.nextUrl.searchParams)
  if (!result.valid || !result.data) {
    return NextResponse.json({ error: result.errors.join('; ') }, { status: 400 })
  }

  try {
    const page = await searchIdentities(result.data)
    return NextResponse.json({ success: true, ...page })
  } catch (error) {
    return errorResponse(error)
  }
}
