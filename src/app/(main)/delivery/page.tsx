import { DeliverySummary } from '@/components/delivery/DeliverySummary'
import { ReadinessDashboard } from '@/components/delivery/ReadinessDashboard'
import { FounderDeliveryQueue } from '@/components/delivery/FounderDeliveryQueue'
import { ProductDeliveryRegister } from '@/components/delivery/ProductDeliveryRegister'
import { ChannelGatesReference } from '@/components/delivery/ChannelGatesReference'

export const dynamic = 'force-dynamic'

export default function DeliveryPage() {
  return (
    <div className="space-y-6">
      <DeliverySummary />
      <ReadinessDashboard />
      <FounderDeliveryQueue />
      <ProductDeliveryRegister />
      <ChannelGatesReference />
    </div>
  )
}
