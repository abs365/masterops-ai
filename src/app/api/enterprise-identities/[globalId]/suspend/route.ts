import { NextRequest, NextResponse } from 'next/server'
import { suspendIdentity } from '@/lib/enterprise-identities/repository'
import { errorResponse } from '@/lib/enterprise-identities/http'
import { isNonEmptyString } from '@/lib/enterprise-identities/validation'
import { verifyFoundationApiRequest } from '@/lib/enterprise-api-security/guard'

export async function POST(req: NextRequest, { params }: { params: Promise<{ globalId: string }> }) {
  const guard = await verifyFoundationApiRequest(req, 'enterprise-identities:write')
  if (!guard.ok) return guard.response

  const { globalId } = await params
  const body = await req.json().catch(() => ({}))
  const actor = isNonEmptyString((body as Record<string, unknown>)?.actor) ? (body as { actor: string }).actor : undefined

  try {
    const identity = await suspendIdentity(globalId, actor)
    return NextResponse.json({ success: true, data: identity })
  } catch (error) {
    return errorResponse(error)
  }
}
