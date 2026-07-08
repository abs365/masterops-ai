import { Activity, ShieldAlert, ListChecks } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { StatCard } from '@/components/dashboard/StatCard'
import { getDashboardStats } from '@/lib/dashboard-stats'
import { getFounderActionQueue } from '@/lib/founder-action-queue'

export async function OperationsSummary() {
  const [stats, queue] = await Promise.all([getDashboardStats(), getFounderActionQueue()])

  const criticalItems = queue.filter(i => i.severity === 'critical').length
  const attentionNeeded = criticalItems > 0
  const hasData = stats.configured && stats.total > 0
  const healthy = hasData && !attentionNeeded

  let headline: string
  let nextStep: string

  if (!hasData) {
    headline = 'No live platform data yet.'
    nextStep = 'Register projects and connect monitoring to activate the Operations Centre.'
  } else if (attentionNeeded) {
    headline = 'The platform needs attention.'
    nextStep = `${criticalItems} critical item${criticalItems === 1 ? '' : 's'} in the Founder Action Queue below.`
  } else if (queue.length > 0) {
    headline = 'The platform is healthy.'
    nextStep = `No urgent issues. ${queue.length} configuration item${queue.length === 1 ? '' : 's'} in the Founder Action Queue when you have time.`
  } else {
    headline = 'The platform is healthy.'
    nextStep = 'No urgent issues. Nothing requires Founder action right now.'
  }

  return (
    <div className="space-y-4">
      <Card className="text-sm text-gray-700 leading-relaxed space-y-1">
        <p className="font-semibold text-gray-900">{headline}</p>
        <p>{nextStep}</p>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <StatCard
          title="Is The Platform Healthy?"
          value={!hasData ? 'No Data' : healthy ? 'Yes' : 'No'}
          icon={Activity}
          color={!hasData ? 'default' : healthy ? 'green' : 'red'}
        />
        <StatCard
          title="Needs Immediate Attention?"
          value={attentionNeeded ? 'Yes' : 'No'}
          icon={ShieldAlert}
          color={attentionNeeded ? 'red' : 'green'}
        />
        <StatCard
          title="Founder Actions Pending"
          value={queue.length}
          icon={ListChecks}
          color={queue.length > 0 ? 'yellow' : 'default'}
        />
      </div>
    </div>
  )
}
