import { createClient } from '@/lib/supabase/server'

export interface CostSummary {
  totalToday: number
  totalYesterday: number
  byProvider: Record<string, { cost: number; requests: number }>
  topEndpoints: [string, number][]
  logCount: number
}

export async function getCostSummary(): Promise<CostSummary> {
  try {
    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

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

    const totalToday = todayLogs.reduce((s, r) => s + (r.estimated_cost ?? 0), 0)
    const totalYesterday = yesterdayLogs.reduce((s, r) => s + (r.estimated_cost ?? 0), 0)

    const byProvider: Record<string, { cost: number; requests: number }> = {}
    for (const log of todayLogs) {
      if (!log.provider) continue
      if (!byProvider[log.provider]) byProvider[log.provider] = { cost: 0, requests: 0 }
      byProvider[log.provider].cost += log.estimated_cost ?? 0
      byProvider[log.provider].requests += log.request_count ?? 0
    }

    const byEndpoint: Record<string, number> = {}
    for (const log of todayLogs) {
      const key = `${log.provider ?? 'unknown'} / ${log.endpoint ?? 'unknown'}`
      byEndpoint[key] = (byEndpoint[key] ?? 0) + (log.estimated_cost ?? 0)
    }
    const topEndpoints = Object.entries(byEndpoint)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)

    return { totalToday, totalYesterday, byProvider, topEndpoints, logCount: todayLogs.length }
  } catch {
    return { totalToday: 0, totalYesterday: 0, byProvider: {}, topEndpoints: [], logCount: 0 }
  }
}
