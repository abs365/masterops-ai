import { NextRequest, NextResponse } from 'next/server'
import { validateRelationshipInput } from '@/lib/enterprise-assets/validation'
import { createRelationship, listRelationships } from '@/lib/enterprise-assets/repository'
import { errorResponse } from '@/lib/enterprise-assets/http'
import { verifyFoundationApiRequest } from '@/lib/enterprise-api-security/guard'

export async function GET(req: NextRequest, { params }: { params: Promise<{ globalId: string }> }) {
  const guard = await verifyFoundationApiRequest(req, 'enterprise-assets:read')
  if (!guard.ok) return guard.response

  const { globalId } = await params

  try {
    const relationships = await listRelationships(globalId)
    return NextResponse.json({ success: true, data: relationships })
  } catch (error) {
    return errorResponse(error)
  }
}

// The asset in the URL is always the relationship's source; the body
// supplies the target, e.g. POST /api/enterprise-assets/MO-PROD-000001/relationships
// { target_global_id: 'MO-SVC-000002', relationship_type: 'depends_on' }
export async function POST(req: NextRequest, { params }: { params: Promise<{ globalId: string }> }) {
  const guard = await verifyFoundationApiRequest(req, 'enterprise-assets:write')
  if (!guard.ok) return guard.response

  const { globalId } = await params
  const body = await req.json().catch(() => null)
  const merged = { ...(body ?? {}), source_global_id: globalId }
  const result = validateRelationshipInput(merged)
  if (!result.valid || !result.data) {
    return NextResponse.json({ error: result.errors.join('; ') }, { status: 400 })
  }

  try {
    const relationship = await createRelationship(result.data)
    return NextResponse.json({ success: true, data: relationship }, { status: 201 })
  } catch (error) {
    return errorResponse(error)
  }
}
