import { FolderKanban, CheckCircle, XCircle, Bell, ShieldAlert, DollarSign } from 'lucide-react'
import { StatCard } from './StatCard'
import { createClient } from '@/lib/supabase/server'

async function getStats() {
  const configured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!configured) {
    return { configured: false, total: 0, online: 0, down: 0, degraded: 0, openAlerts: 0, criticalSec: 0, totalCost: 0 }
  }

  try {
    const supabase = await createClient()
    const [projects, alerts, secEvents, costs] = await Promise.all([
      supabase.from('projects').select('status'),
      supabase.from('alerts').select('id').eq('status', 'open'),
      supabase.from('security_events').select('id').in('severity', ['critical', 'emergency']),
      supabase.from('api_usage_logs').select('estimated_cost'),
    ])

    const statuses = projects.data ?? []
    const total = statuses.length
    const online = statuses.filter(p => p.status === 'online').length
    const down = statuses.filter(p => p.status === 'down').length
    const degraded = statuses.filter(p => p.status === 'slow' || p.status === 'warning').length
    const openAlerts = alerts.data?.length ?? 0
    const criticalSec = secEvents.data?.length ?? 0
    const totalCost = costs.data?.reduce((s, r) => s + (r.estimated_cost ?? 0), 0) ?? 0

    return { configured: true, total, online, down, degraded, openAlerts, criticalSec, totalCost }
  } catch {
    return { configured: false, total: 0, online: 0, down: 0, degraded: 0, openAlerts: 0, criticalSec: 0, totalCost: 0 }
  }
}

export async function DashboardCards() {
  const s = await getStats()

  return (
    <div className="space-y-3">
      {!s.configured && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          Supabase not connected — add <code className="font-mono text-xs bg-yellow-100 px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code> and <code className="font-mono text-xs bg-yellow-100 px-1 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to <code className="font-mono text-xs bg-yellow-100 px-1 rounded">.env.local</code> to see live data.
        </div>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title="Total Projects" value={s.total} icon={FolderKanban} color="indigo" />
        <StatCard
          title="Online"
          value={s.online}
          icon={CheckCircle}
          color="green"
          sub={s.degraded > 0 ? `${s.degraded} degraded` : undefined}
        />
        <StatCard
          title="Down"
          value={s.down}
          icon={XCircle}
          color={s.down > 0 ? 'red' : 'default'}
        />
        <StatCard
          title="Open Alerts"
          value={s.openAlerts}
          icon={Bell}
          color={s.openAlerts > 0 ? 'yellow' : 'default'}
        />
        <StatCard
          title="Critical Events"
          value={s.criticalSec}
          icon={ShieldAlert}
          color={s.criticalSec > 0 ? 'red' : 'default'}
        />
        <StatCard
          title="Est. API Cost"
          value={`$${s.totalCost.toFixed(2)}`}
          icon={DollarSign}
          color="default"
          sub="today"
        />
      </div>
    </div>
  )
}
