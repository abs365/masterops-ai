import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { notify } from '@/lib/notifications'
import { AlertSeverity } from '@/types'

const VALID_SEVERITIES: AlertSeverity[] = ['info', 'warning', 'critical', 'emergency']

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { project_id, title, message, severity } = body

  if (!title || typeof title !== 'string') {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  const resolvedSeverity: AlertSeverity = VALID_SEVERITIES.includes(severity) ? severity : 'info'

  const supabase = await createServiceClient()

  // Validate project_id if provided
  if (project_id) {
    const { data: proj } = await supabase
      .from('projects')
      .select('id')
      .eq('id', project_id)
      .single()
    if (!proj) {
      return NextResponse.json({ error: 'project_id not found' }, { status: 400 })
    }
  }

  // Deduplicate: don't create if an open alert with same title + project already exists
  const dupQuery = supabase
    .from('alerts')
    .select('id')
    .eq('title', title)
    .eq('status', 'open')

  if (project_id) {
    dupQuery.eq('project_id', project_id)
  } else {
    dupQuery.is('project_id', null)
  }

  const { data: existing } = await dupQuery.limit(1)
  if (existing && existing.length > 0) {
    return NextResponse.json({ success: true, duplicate: true, id: existing[0].id })
  }

  const { data, error } = await supabase
    .from('alerts')
    .insert({
      project_id: project_id ?? null,
      title,
      message: message ?? null,
      severity: resolvedSeverity,
      status: 'open',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (resolvedSeverity === 'critical' || resolvedSeverity === 'emergency') {
    await notify(title, message ?? '', resolvedSeverity)
  }

  return NextResponse.json({ success: true, duplicate: false, data })
}
