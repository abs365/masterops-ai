import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { notify } from '@/lib/notifications'
import { Project, ProjectStatus } from '@/types'

function classifyStatus(httpStatus: number, ms: number): ProjectStatus {
  if (httpStatus === 0) return 'down'
  if (httpStatus >= 500) return 'down'
  if (httpStatus >= 400) return 'warning'
  if (ms > 2000) return 'slow'
  return 'online'
}

function authCheck(req: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET
  if (!secret) return null // no secret set — allow all calls
  const provided = req.nextUrl.searchParams.get('secret')
  if (provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

async function createAlertIfNotDuplicate(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  projectId: string,
  title: string,
  message: string,
  severity: string
): Promise<boolean> {
  // Check for an existing open alert with the same title and project
  const { data: existing } = await supabase
    .from('alerts')
    .select('id')
    .eq('project_id', projectId)
    .eq('title', title)
    .eq('status', 'open')
    .limit(1)

  if (existing && existing.length > 0) return false

  await supabase.from('alerts').insert({
    project_id: projectId,
    title,
    message,
    severity,
    status: 'open',
  })

  if (severity === 'critical' || severity === 'emergency') {
    await notify(title, message, severity)
  }

  return true
}

async function runChecks() {
  const supabase = await createServiceClient()

  const { data: projects, error } = await supabase
    .from('projects')
    .select('*')

  if (error) throw new Error(error.message)

  const results = []

  for (const project of projects as Project[]) {
    if (!project.url) {
      await supabase
        .from('projects')
        .update({ status: 'unknown', last_checked_at: new Date().toISOString() })
        .eq('id', project.id)
      results.push({ name: project.name, status: 'unknown', reason: 'no_url' })
      continue
    }

    let httpStatus = 0
    let ms = 0
    try {
      const start = Date.now()
      const res = await fetch(project.url, {
        method: 'GET',
        signal: AbortSignal.timeout(10000),
        headers: { 'User-Agent': 'MasterOps-Monitor/1.0' },
      })
      ms = Date.now() - start
      httpStatus = res.status
    } catch {
      ms = 10000
      httpStatus = 0
    }

    const status = classifyStatus(httpStatus, ms)

    await supabase
      .from('projects')
      .update({ status, response_time_ms: ms, last_checked_at: new Date().toISOString() })
      .eq('id', project.id)

    let alertCreated = false
    if (status === 'down') {
      alertCreated = await createAlertIfNotDuplicate(
        supabase,
        project.id,
        `${project.name} is DOWN`,
        `HTTP ${httpStatus || 'timeout'} — response time ${ms}ms`,
        'critical'
      )
    } else if (status === 'slow') {
      alertCreated = await createAlertIfNotDuplicate(
        supabase,
        project.id,
        `${project.name} is responding slowly`,
        `Response time ${ms}ms exceeds 2000ms threshold`,
        'warning'
      )
    }

    results.push({ name: project.name, status, ms, httpStatus, alertCreated })
  }

  return results
}

export async function GET(req: NextRequest) {
  const denied = authCheck(req)
  if (denied) return denied

  try {
    const results = await runChecks()
    return NextResponse.json({ checked: results.length, results })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const denied = authCheck(req)
  if (denied) return denied

  try {
    const results = await runChecks()
    return NextResponse.json({ checked: results.length, results })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
