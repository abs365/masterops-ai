import { NextRequest, NextResponse } from 'next/server'
import { validateLinkAssetInput, isNonEmptyString } from '@/lib/enterprise-identities/validation'
import { linkIdentityAsset, unlinkIdentityAsset } from '@/lib/enterprise-identities/repository'
import { errorResponse } from '@/lib/enterprise-identities/http'

export async function POST(req: NextRequest, { params }: { params: Promise<{ globalId: string }> }) {
  const { globalId } = await params
  const body = await req.json().catch(() => null)
  const result = validateLinkAssetInput(body)
  if (!result.valid || !result.data) {
    return NextResponse.json({ error: result.errors.join('; ') }, { status: 400 })
  }

  try {
    const identity = await linkIdentityAsset(globalId, result.data)
    return NextResponse.json({ success: true, data: identity })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ globalId: string }> }) {
  const { globalId } = await params
  const body = await req.json().catch(() => ({}))
  const actor = isNonEmptyString((body as Record<string, unknown>)?.actor) ? (body as { actor: string }).actor : undefined

  try {
    const identity = await unlinkIdentityAsset(globalId, actor)
    return NextResponse.json({ success: true, data: identity })
  } catch (error) {
    return errorResponse(error)
  }
}
