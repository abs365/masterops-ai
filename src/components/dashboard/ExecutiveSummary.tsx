import { Card } from '@/components/ui/Card'
import { getDashboardStats } from '@/lib/dashboard-stats'
import { formatCost } from '@/lib/utils'

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

  return (
    <Card className="text-sm text-gray-700 leading-relaxed">
      {buildSummary(stats)}
    </Card>
  )
}
