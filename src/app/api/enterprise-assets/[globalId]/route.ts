import { NextRequest, NextResponse } from 'next/server'
import { validateUpdateAssetInput } from '@/lib/enterprise-assets/validation'
import { getAsset, updateAsset } from '@/lib/enterprise-assets/repository'
import { errorResponse } from '@/lib/enterprise-assets/http'
import { verifyFoundationApiRequest } from '@/lib/enterprise-api-security/guard'

export async function GET(req: NextRequest, { params }: { params: Promise<{ globalId: string }> }) {
  const guard = await verifyFoundationApiRequest(req, 'enterprise-assets:read')
  if (!guard.ok) return guard.response

  const { globalId } = await params

  try {
    const asset = await getAsset(globalId)
    if (!asset) return NextResponse.json({ error: `Enterprise asset not found: ${globalId}` }, { status: 404 })
    return NextResponse.json({ success: true, data: asset })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ globalId: string }> }) {
  const guard = await verifyFoundationApiRequest(req, 'enterprise-assets:write')
  if (!guard.ok) return guard.response

  const { globalId } = await params
  const body = await req.json().catch(() => null)
  const result = validateUpdateAssetInput(body)
  if (!result.valid || !result.data) {
    return NextResponse.json({ error: result.errors.join('; ') }, { status: 400 })
  }

  try {
    const asset = await updateAsset(globalId, result.data)
    return NextResponse.json({ success: true, data: asset })
  } catch (error) {
    return errorResponse(error)
  }
}
