import { FolderKanban, CheckCircle, XCircle, Bell, ShieldAlert, DollarSign } from 'lucide-react'
import { StatCard } from './StatCard'
import { getDashboardStats } from '@/lib/dashboard-stats'

export async function DashboardCards() {
  const s = await getDashboardStats()

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
