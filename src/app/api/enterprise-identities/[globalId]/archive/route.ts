import { NextRequest, NextResponse } from 'next/server'
import { archiveIdentity } from '@/lib/enterprise-identities/repository'
import { errorResponse } from '@/lib/enterprise-identities/http'
import { isNonEmptyString } from '@/lib/enterprise-identities/validation'

export async function POST(req: NextRequest, { params }: { params: Promise<{ globalId: string }> }) {
  const { globalId } = await params
  const body = await req.json().catch(() => ({}))
  const actor = isNonEmptyString((body as Record<string, unknown>)?.actor) ? (body as { actor: string }).actor : undefined

  try {
    const identity = await archiveIdentity(globalId, actor)
    return NextResponse.json({ success: true, data: identity })
  } catch (error) {
    return errorResponse(error)
  }
}
