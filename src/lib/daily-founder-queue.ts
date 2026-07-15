import { getFounderActionQueue } from '@/lib/founder-action-queue'
import { getFounderDeliveryQueue } from '@/lib/founder-delivery-queue'

export interface DailyQueueItem {
  title: string
  detail: string
  severity: 'critical' | 'warning' | 'info'
  href?: string
  source: 'Operations' | 'Delivery'
}

const severityRank: Record<DailyQueueItem['severity'], number> = { critical: 0, warning: 1, info: 2 }

/**
 * Daily Founder Operations (EOP-001) — the Founder currently has to check
 * the Operations Centre's Founder Action Queue (D-005) and the Delivery
 * Centre's Founder Delivery Queue (D-008) separately to know what needs
 * attention today. Neither queue is redesigned here; this only merges
 * their existing output into one severity-sorted daily list. Both source
 * queues remain exactly as they are on their own pages.
 */
export async function getDailyFounderQueue(): Promise<DailyQueueItem[]> {
  const [operations, delivery] = await Promise.all([getFounderActionQueue(), getFounderDeliveryQueue()])

  const merged: DailyQueueItem[] = [
    ...operations.map(item => ({ ...item, source: 'Operations' as const })),
    ...delivery.map(item => ({ ...item, source: 'Delivery' as const })),
  ]

  return merged.sort((a, b) => severityRank[a.severity] - severityRank[b.severity])
}
