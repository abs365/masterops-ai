import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { notify } from '@/lib/notifications'

const VALID_PROVIDERS = [
  'openai', 'anthropic', 'google_maps', 'google_places',
  'supabase', 'vercel', 'resend', 'twilio', 'stripe', 'other',
]

const HIGH_SINGLE_COST_THRESHOLD = 1.00

function authCheck(req: NextRequest): NextResponse | null {
  const secret = process.env.USAGE_INGEST_SECRET
  if (!secret) return null
  const provided = req.headers.get('x-masterops-secret')
  if (provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

export async function POST(req: NextRequest) {
  const denied = authCheck(req)
  if (denied) return denied

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { project_slug, provider, endpoint, request_count, estimated_cost } = body

  if (!provider || typeof provider !== 'string') {
    return NextResponse.json({ error: 'provider is required' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  // Resolve project
  let projectId: string | null = null
  if (project_slug) {
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('slug', project_slug as string)
      .single()
    if (!project) {
      return NextResponse.json({ error: `project_slug '${project_slug}' not found` }, { status: 400 })
    }
    projectId = project.id
  }

  const cost = typeof estimated_cost === 'number' ? estimated_cost : 0
  const count = typeof request_count === 'number' ? request_count : 1

  const { data, error } = await supabase
    .from('api_usage_logs')
    .insert({
      project_id: projectId,
      provider: VALID_PROVIDERS.includes(provider) ? provider : 'other',
      endpoint: (endpoint as string) ?? null,
      request_count: count,
      estimated_cost: cost,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Alert on unusually high single log cost
  if (cost > HIGH_SINGLE_COST_THRESHOLD) {
    const title = `High API cost detected — ${provider}`
    const message = `Single log: $${cost.toFixed(4)} on ${endpoint ?? 'unknown endpoint'} (project: ${project_slug ?? 'unknown'})`
    await supabase.from('alerts').insert({ project_id: projectId, title, message, severity: 'warning', status: 'open' })
    await notify(title, message, 'warning')
  }

  return NextResponse.json({ success: true, id: (data as { id: string }).id })
}
