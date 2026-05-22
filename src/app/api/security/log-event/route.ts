import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { notify } from '@/lib/notifications'

const VALID_SEVERITIES = ['info', 'warning', 'critical', 'emergency']

function authCheck(req: NextRequest): NextResponse | null {
  const secret = process.env.SECURITY_INGEST_SECRET
  if (!secret) return null // open in local dev
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

  const { project_slug, event_type, severity, description, ip_address, user_agent, metadata } = body

  if (!event_type || typeof event_type !== 'string') {
    return NextResponse.json({ error: 'event_type is required' }, { status: 400 })
  }

  const resolvedSeverity = VALID_SEVERITIES.includes(severity as string)
    ? (severity as string)
    : 'info'

  const supabase = await createServiceClient()

  // Resolve project_slug → project_id
  let projectId: string | null = null
  if (project_slug) {
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('slug', project_slug)
      .single()
    if (!project) {
      return NextResponse.json({ error: `project_slug '${project_slug}' not found` }, { status: 400 })
    }
    projectId = project.id
  }

  const { data, error } = await supabase
    .from('security_events')
    .insert({
      project_id: projectId,
      event_type,
      severity: resolvedSeverity,
      description: description ?? null,
      ip_address: (ip_address as string) ?? req.headers.get('x-forwarded-for') ?? null,
      user_agent: (user_agent as string) ?? req.headers.get('user-agent') ?? null,
      metadata: metadata ?? {},
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (resolvedSeverity === 'critical' || resolvedSeverity === 'emergency') {
    const alertTitle = `Security: ${event_type}`
    const alertMessage = (description as string) ?? `Severity: ${resolvedSeverity}`

    await supabase.from('alerts').insert({
      project_id: projectId,
      title: alertTitle,
      message: alertMessage,
      severity: resolvedSeverity,
      status: 'open',
    })

    await notify(alertTitle, alertMessage, resolvedSeverity)
  }

  return NextResponse.json({ success: true, id: (data as { id: string }).id })
}
