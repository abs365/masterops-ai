import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { getFounderActionQueue, FounderQueueItem } from '@/lib/founder-action-queue'

const severityStyle: Record<FounderQueueItem['severity'], string> = {
  critical: 'text-red-600 bg-red-50 border-red-200',
  warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  info: 'text-gray-500 bg-gray-50 border-gray-200',
}
const severityLabel: Record<FounderQueueItem['severity'], string> = {
  critical: 'Critical',
  warning: 'Configuration',
  info: 'Info',
}

export async function FounderActionQueue() {
  const items = await getFounderActionQueue()

  return (
    <Card padded={false}>
      <CardHeader title="Founder Action Queue" />
      {items.length === 0 ? (
        <EmptyState icon={CheckCircle2} message="Nothing requires Founder attention right now." />
      ) : (
        <ul className="divide-y divide-gray-50">
          {items.map((item, i) => (
            <li key={i} className="px-5 py-3 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm text-gray-800">{item.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.detail}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium whitespace-nowrap ${severityStyle[item.severity]}`}>
                  {severityLabel[item.severity]}
                </span>
                {item.href && (
                  <Link href={item.href} className="text-xs text-indigo-600 hover:underline whitespace-nowrap">
                    View →
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
