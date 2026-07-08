import Link from 'next/link'
import { DollarSign } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCost } from '@/lib/utils'
import { getCostSummary } from '@/lib/cost-status'

export async function CostSummary() {
  const d = await getCostSummary()
  const providersActive = Object.keys(d.byProvider).length
  const action = (
    <Link href="/costs" className="text-xs text-indigo-600 hover:underline whitespace-nowrap">
      Full Cost Intelligence →
    </Link>
  )

  return (
    <Card padded={false}>
      <CardHeader title="Cost Summary" action={action} />
      {d.logCount === 0 ? (
        <EmptyState icon={DollarSign} message="No cost data recorded yet today." />
      ) : (
        <div className="px-5 py-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-gray-900">{formatCost(d.totalToday)}</p>
            <p className="text-xs text-gray-400">Today</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-500">{formatCost(d.totalYesterday)}</p>
            <p className="text-xs text-gray-400">Yesterday</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-indigo-600">{providersActive}</p>
            <p className="text-xs text-gray-400">Providers Active</p>
          </div>
        </div>
      )}
    </Card>
  )
}
