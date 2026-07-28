import { NextRequest, NextResponse } from 'next/server'
import { validateSearchQuery } from '@/lib/enterprise-assets/validation'
import { searchAssets } from '@/lib/enterprise-assets/repository'
import { errorResponse } from '@/lib/enterprise-assets/http'

export async function GET(req: NextRequest) {
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
