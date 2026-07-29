import { NextRequest, NextResponse } from 'next/server'
import { validateCreateAssetInput, validateListQuery } from '@/lib/enterprise-assets/validation'
import { createAsset, listAssets, assetTypeExists } from '@/lib/enterprise-assets/repository'
import { errorResponse } from '@/lib/enterprise-assets/http'
import { verifyFoundationApiRequest } from '@/lib/enterprise-api-security/guard'

export async function GET(req: NextRequest) {
  const guard = await verifyFoundationApiRequest(req, 'enterprise-assets:read')
  if (!guard.ok) return guard.response

  const result = validateListQuery(req.nextUrl.searchParams)
  if (!result.valid || !result.data) {
    return NextResponse.json({ error: result.errors.join('; ') }, { status: 400 })
  }

  try {
    const page = await listAssets(result.data)
    return NextResponse.json({ success: true, ...page })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(req: NextRequest) {
  const guard = await verifyFoundationApiRequest(req, 'enterprise-assets:write')
  if (!guard.ok) return guard.response

  const body = await req.json().catch(() => null)
  const result = validateCreateAssetInput(body)
  if (!result.valid || !result.data) {
    return NextResponse.json({ error: result.errors.join('; ') }, { status: 400 })
  }

  try {
    const typeExists = await assetTypeExists(result.data.asset_type_code)
    if (!typeExists) {
      return NextResponse.json(
        { error: `Unknown or inactive asset_type_code: ${result.data.asset_type_code}` },
        { status: 400 }
      )
    }

    const asset = await createAsset(result.data)
    return NextResponse.json({ success: true, data: asset }, { status: 201 })
  } catch (error) {
    return errorResponse(error)
  }
}
