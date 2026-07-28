import { NextRequest, NextResponse } from 'next/server'
import { validateUpdateIdentityInput } from '@/lib/enterprise-identities/validation'
import { getIdentity, updateIdentity } from '@/lib/enterprise-identities/repository'
import { errorResponse } from '@/lib/enterprise-identities/http'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ globalId: string }> }) {
  const { globalId } = await params

  try {
    const identity = await getIdentity(globalId)
    if (!identity) return NextResponse.json({ error: `Enterprise identity not found: ${globalId}` }, { status: 404 })
    return NextResponse.json({ success: true, data: identity })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ globalId: string }> }) {
  const { globalId } = await params
  const body = await req.json().catch(() => null)
  const result = validateUpdateIdentityInput(body)
  if (!result.valid || !result.data) {
    return NextResponse.json({ error: result.errors.join('; ') }, { status: 400 })
  }

  try {
    const identity = await updateIdentity(globalId, result.data)
    return NextResponse.json({ success: true, data: identity })
  } catch (error) {
    return errorResponse(error)
  }
}
