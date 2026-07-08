import { Activity, Server, Layers, Gauge } from 'lucide-react'
import { StatCard } from '@/components/dashboard/StatCard'
import { getDashboardStats, DashboardStats } from '@/lib/dashboard-stats'

type HealthLabel = 'No Data' | 'Healthy' | 'Attention Needed' | 'Critical'

function overallHealth(s: DashboardStats): { label: HealthLabel; color: 'default' | 'green' | 'yellow' | 'red' } {
  if (!s.configured || s.total === 0) return { label: 'No Data', color: 'default' }
  if (s.down > 0) return { label: 'Critical', color: 'red' }
  if (s.degraded > 0 || s.criticalAlerts > 0 || s.criticalSec > 0) return { label: 'Attention Needed', color: 'yellow' }
  return { label: 'Healthy', color: 'green' }
}

export async function PlatformHealth() {
  const stats = await getDashboardStats()
  const health = overallHealth(stats)
  const availability = stats.total > 0 ? Math.round((stats.online / stats.total) * 100) : null

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Platform Health</h3>
        <p className="text-xs text-gray-400">Derived from live platform status monitoring</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Overall Platform Status" value={health.label} icon={Activity} color={health.color} />
        <StatCard
          title="Production Health"
          value={stats.configured && stats.total > 0 ? `${stats.online} of ${stats.total} online` : 'No Data'}
          icon={Server}
          color={stats.down > 0 ? 'red' : 'default'}
        />
        <StatCard
          title="Environment Health"
          value={stats.configured && stats.total > 0 ? `${stats.down} down · ${stats.degraded} degraded` : 'No Data'}
          icon={Layers}
          color={stats.down > 0 ? 'red' : stats.degraded > 0 ? 'yellow' : 'default'}
        />
        <StatCard
          title="System Availability"
          value={availability !== null ? `${availability}%` : 'No Data'}
          icon={Gauge}
          color={availability !== null && availability < 100 ? 'yellow' : 'default'}
        />
      </div>
    </div>
  )
}
