import { NextRequest, NextResponse } from 'next/server'
import { validateSearchQuery } from '@/lib/enterprise-assets/validation'
import { searchAssets } from '@/lib/enterprise-assets/repository'
import { errorResponse } from '@/lib/enterprise-assets/http'
import { verifyFoundationApiRequest } from '@/lib/enterprise-api-security/guard'

export async function GET(req: NextRequest) {
  const guard = await verifyFoundationApiRequest(req, 'enterprise-assets:read')
  if (!guard.ok) return guard.response

  const result = validateSearchQuery(req.nextUrl.searchParams)
  if (!result.valid || !result.data) {
    return NextResponse.json({ error: result.errors.join('; ') }, { status: 400 })
  }

  try {
    const page = await searchAssets(result.data)
    return NextResponse.json({ success: true, ...page })
  } catch (error) {
    return errorResponse(error)
  }
}
