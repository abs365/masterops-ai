import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateDailyReport } from '@/lib/ai/reports'

export async function POST() {
  const supabase = await createServiceClient()
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  const [projectsRes, alertsRes, secRes, costTodayRes, costYestRes] = await Promise.all([
    supabase.from('projects').select('name, status, response_time_ms, category'),
    supabase.from('alerts').select('severity, title, status'),
    supabase.from('security_events').select('severity, event_type').gte('created_at', `${today}T00:00:00Z`),
    supabase.from('api_usage_logs').select('estimated_cost').gte('created_at', `${today}T00:00:00Z`),
    supabase.from('api_usage_logs').select('estimated_cost')
      .gte('created_at', `${yesterday}T00:00:00Z`)
      .lt('created_at', `${today}T00:00:00Z`),
  ])

  const projects = projectsRes.data ?? []
  const alerts = alertsRes.data ?? []
  const secEvents = secRes.data ?? []
  const costToday = (costTodayRes.data ?? []).reduce((s, r) => s + (r.estimated_cost ?? 0), 0)
  const costYesterday = (costYestRes.data ?? []).reduce((s, r) => s + (r.estimated_cost ?? 0), 0)
  const dailyLimit = parseFloat(process.env.DAILY_COST_LIMIT_GBP ?? '10')

  const report = await generateDailyReport({ projects, alerts, secEvents, costToday, costYesterday, dailyLimit })

  const { data, error } = await supabase
    .from('daily_reports')
    .upsert({ report_date: today, ...report }, { onConflict: 'report_date' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, ai_generated: report.ai_generated, data })
}

export async function GET() {
  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('daily_reports')
    .select('*')
    .order('report_date', { ascending: false })
    .limit(14)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
