import { Globe, CheckCircle2, CircleDashed } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { StatCard } from '@/components/dashboard/StatCard'
import { getReadinessSummary } from '@/lib/delivery-register'

export async function ReadinessDashboard() {
  const summary = getReadinessSummary()

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <StatCard
          title="Product-Channel Combinations"
          value={summary.totalCombinations}
          icon={Globe}
          color="default"
        />
        <StatCard
          title="Live In Production"
          value={summary.liveCombinations}
          icon={CheckCircle2}
          color={summary.liveCombinations > 0 ? 'green' : 'default'}
        />
        <StatCard
          title="Not Yet Assessed"
          value={summary.notStartedCombinations}
          icon={CircleDashed}
          color="yellow"
        />
      </div>

      <Card padded={false}>
        <CardHeader title="Readiness By Channel" />
        <ul className="divide-y divide-gray-50">
          {summary.byChannel.map(row => (
            <li key={row.channel} className="px-5 py-3 flex items-center justify-between gap-4">
              <p className="text-sm text-gray-800">{row.channel}</p>
              <p className="text-xs text-gray-500 whitespace-nowrap">
                {row.liveCount} of {row.totalProducts} products live
              </p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
