import { createClient } from '@/lib/supabase/server'

export interface DashboardStats {
  configured: boolean
  total: number
  online: number
  down: number
  degraded: number
  openAlerts: number
  criticalAlerts: number
  criticalSec: number
  totalCost: number
}

const EMPTY_STATS: DashboardStats = {
  configured: false,
  total: 0,
  online: 0,
  down: 0,
  degraded: 0,
  openAlerts: 0,
  criticalAlerts: 0,
  criticalSec: 0,
  totalCost: 0,
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const configured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!configured) return EMPTY_STATS

  try {
    const supabase = await createClient()
    const [projects, alerts, criticalAlerts, secEvents, costs] = await Promise.all([
      supabase.from('projects').select('status'),
      supabase.from('alerts').select('id').eq('status', 'open'),
      supabase.from('alerts').select('id').eq('status', 'open').in('severity', ['critical', 'emergency']),
      supabase.from('security_events').select('id').in('severity', ['critical', 'emergency']),
      supabase.from('api_usage_logs').select('estimated_cost'),
    ])

    const statuses = projects.data ?? []
    const total = statuses.length
    const online = statuses.filter(p => p.status === 'online').length
    const down = statuses.filter(p => p.status === 'down').length
    const degraded = statuses.filter(p => p.status === 'slow' || p.status === 'warning').length
    const openAlerts = alerts.data?.length ?? 0
    const criticalAlertsCount = criticalAlerts.data?.length ?? 0
    const criticalSec = secEvents.data?.length ?? 0
    const totalCost = costs.data?.reduce((s, r) => s + (r.estimated_cost ?? 0), 0) ?? 0

    return {
      configured: true,
      total,
      online,
      down,
      degraded,
      openAlerts,
      criticalAlerts: criticalAlertsCount,
      criticalSec,
      totalCost,
    }
  } catch {
    return EMPTY_STATS
  }
}
