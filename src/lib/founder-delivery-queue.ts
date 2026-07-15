import { getDeliveryRegister } from '@/lib/delivery-register'
import { DELIVERY_CHANNELS } from '@/lib/channel-gates'

export interface DeliveryQueueItem {
  title: string
  detail: string
  severity: 'critical' | 'warning' | 'info'
  href?: string
}

/**
 * The Founder Delivery Queue (D-008) — mirrors the Founder Action Queue's
 * (D-005) one-item-per-real-condition shape. Since the Delivery Register
 * is a fresh, honest Day-1 baseline (see delivery-register.ts), every
 * product genuinely has channels not yet assessed — that is reported as
 * `info`, not inflated to `warning`/`critical`, because "not yet
 * assessed" is not a fault, just an unstarted state.
 */
export async function getFounderDeliveryQueue(): Promise<DeliveryQueueItem[]> {
  const register = getDeliveryRegister()
  const items: DeliveryQueueItem[] = []

  for (const record of register) {
    const notStarted = record.channels.filter(c => c.gateLevel === 0)
    if (notStarted.length === 0) continue

    items.push({
      title: `${notStarted.length} of ${DELIVERY_CHANNELS.length} channels not yet assessed — ${record.businessName}`,
      detail: `${notStarted.map(c => c.channel).join(', ')} have no Channel Gate review on file.`,
      severity: 'info',
      href: '/delivery',
    })
  }

  return items
}
