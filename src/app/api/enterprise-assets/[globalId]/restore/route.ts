import { NextRequest, NextResponse } from 'next/server'
import { restoreAsset } from '@/lib/enterprise-assets/repository'
import { errorResponse } from '@/lib/enterprise-assets/http'
import { isNonEmptyString } from '@/lib/enterprise-assets/validation'

export async function POST(req: NextRequest, { params }: { params: Promise<{ globalId: string }> }) {
  const { globalId } = await params
  const body = await req.json().catch(() => ({}))
  const actor = isNonEmptyString((body as Record<string, unknown>)?.actor) ? (body as { actor: string }).actor : undefined

  try {
    const asset = await restoreAsset(globalId, actor)
    return NextResponse.json({ success: true, data: asset })
  } catch (error) {
    return errorResponse(error)
  }
}
