import { Card } from '@/components/ui/Card'
import { getReadinessSummary } from '@/lib/delivery-register'
import { ENTERPRISE_REGISTRY } from '@/lib/enterprise-registry'
import { DELIVERY_CHANNELS } from '@/lib/channel-gates'

export async function DeliverySummary() {
  const summary = getReadinessSummary()

  return (
    <Card className="text-sm text-gray-700 leading-relaxed space-y-1">
      <p className="font-semibold text-gray-900">
        Tracking {ENTERPRISE_REGISTRY.length} Enterprise products across {DELIVERY_CHANNELS.length} delivery channels.
      </p>
      <p>
        {summary.liveCombinations} of {summary.totalCombinations} product-channel combinations are live in production.
        {' '}This is a Day-1 baseline: gates advance only as real channel reviews happen, never on assumption.
      </p>
    </Card>
  )
}
