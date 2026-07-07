import { Activity, Building2, AlertTriangle, Flag } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { StatCard } from '@/components/dashboard/StatCard'
import { getDashboardStats, DashboardStats } from '@/lib/dashboard-stats'
import { formatCost } from '@/lib/utils'

type HealthLabel = 'No Data' | 'Healthy' | 'Attention Needed' | 'Critical'

function enterpriseHealth(s: DashboardStats): { label: HealthLabel; color: 'default' | 'green' | 'yellow' | 'red' } {
  if (!s.configured || s.total === 0) return { label: 'No Data', color: 'default' }
  if (s.down > 0) return { label: 'Critical', color: 'red' }
  if (s.degraded > 0 || s.criticalAlerts > 0 || s.criticalSec > 0) return { label: 'Attention Needed', color: 'yellow' }
  return { label: 'Healthy', color: 'green' }
}

function buildSummary(s: Awaited<ReturnType<typeof getDashboardStats>>): string {
  if (!s.configured) {
    return 'Enterprise data is not yet connected — configure Supabase to see a live summary here.'
  }
  if (s.total === 0) {
    return 'No platforms are registered in the portfolio yet.'
  }

  const parts: string[] = [`${s.online} of ${s.total} platform${s.total === 1 ? '' : 's'} online`]

  if (s.down > 0) parts.push(`${s.down} down`)
  if (s.degraded > 0) parts.push(`${s.degraded} degraded`)

  let summary = parts.join(', ') + '.'

  if (s.openAlerts > 0) {
    summary += ` ${s.openAlerts} open alert${s.openAlerts === 1 ? '' : 's'}`
    summary += s.criticalSec > 0 ? `, including ${s.criticalSec} critical security event${s.criticalSec === 1 ? '' : 's'}.` : '.'
  } else {
    summary += ' No open alerts.'
  }

  summary += ` Estimated spend today: ${formatCost(s.totalCost)}.`

  return summary
}

export async function ExecutiveSummary() {
  const stats = await getDashboardStats()
  const health = enterpriseHealth(stats)
  const criticalIssues = stats.down + stats.criticalSec + stats.criticalAlerts

  return (
    <div className="space-y-4">
      <Card className="text-sm text-gray-700 leading-relaxed">
        {buildSummary(stats)}
      </Card>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Enterprise Health" value={health.label} icon={Activity} color={health.color} />
        <StatCard title="Active Businesses" value={stats.total} icon={Building2} color="indigo" />
        <StatCard
          title="Critical Issues"
          value={criticalIssues}
          icon={AlertTriangle}
          color={criticalIssues > 0 ? 'red' : 'default'}
        />
        <StatCard
          title="Founder Attention"
          value={stats.criticalAlerts}
          icon={Flag}
          color={stats.criticalAlerts > 0 ? 'yellow' : 'default'}
          sub={stats.criticalAlerts > 0 ? 'See Founder Action Centre' : undefined}
        />
      </div>
    </div>
  )
}
