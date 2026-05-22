import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { notify } from '@/lib/notifications'

export async function GET() {
  const supabase = await createServiceClient()
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  const dailyLimitGBP = parseFloat(process.env.DAILY_COST_LIMIT_GBP ?? '10')

  const [todayRes, yesterdayRes] = await Promise.all([
    supabase
      .from('api_usage_logs')
      .select('provider, endpoint, estimated_cost, request_count')
      .gte('created_at', `${today}T00:00:00Z`),
    supabase
      .from('api_usage_logs')
      .select('estimated_cost')
      .gte('created_at', `${yesterday}T00:00:00Z`)
      .lt('created_at', `${today}T00:00:00Z`),
  ])

  const todayLogs = todayRes.data ?? []
  const yesterdayLogs = yesterdayRes.data ?? []

  // Totals
  const totalCostToday = todayLogs.reduce((s, r) => s + (r.estimated_cost ?? 0), 0)
  const totalCostYesterday = yesterdayLogs.reduce((s, r) => s + (r.estimated_cost ?? 0), 0)

  // Cost by provider
  const byProvider: Record<string, number> = {}
  for (const log of todayLogs) {
    if (!log.provider) continue
    byProvider[log.provider] = (byProvider[log.provider] ?? 0) + (log.estimated_cost ?? 0)
  }

  // Top endpoints by cost
  const byEndpoint: Record<string, number> = {}
  for (const log of todayLogs) {
    const key = `${log.provider ?? 'unknown'} / ${log.endpoint ?? 'unknown'}`
    byEndpoint[key] = (byEndpoint[key] ?? 0) + (log.estimated_cost ?? 0)
  }
  const topEndpoints = Object.entries(byEndpoint)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([endpoint, cost]) => ({ endpoint, cost }))

  // Spike detection
  const spikeDetected =
    totalCostYesterday > 0 && totalCostToday > totalCostYesterday * 3

  // Alert on limit exceeded
  if (totalCostToday > dailyLimitGBP) {
    const severity = totalCostToday > dailyLimitGBP * 3 ? 'emergency' : 'critical'
    const title = `Daily API cost limit exceeded`
    const message = `Today's cost: $${totalCostToday.toFixed(4)} — limit: $${dailyLimitGBP}`
    await supabase.from('alerts').upsert(
      { title, message, severity, status: 'open' },
      { onConflict: 'title,status' }
    )
    await notify(title, message, severity)
  }

  if (spikeDetected) {
    const title = `API cost spike detected`
    const message = `Today $${totalCostToday.toFixed(4)} vs yesterday $${totalCostYesterday.toFixed(4)} — ${Math.round(totalCostToday / totalCostYesterday)}x spike`
    await supabase.from('alerts').insert({ title, message, severity: 'warning', status: 'open' })
  }

  return NextResponse.json({
    totalCostToday,
    totalCostYesterday,
    byProvider,
    topEndpoints,
    spikeDetected,
    dailyLimitGBP,
    logCount: todayLogs.length,
  })
}
