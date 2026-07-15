import { Card, CardHeader } from '@/components/ui/Card'
import { CHANNEL_GATES } from '@/lib/channel-gates'

export function ChannelGatesReference() {
  return (
    <Card padded={false}>
      <CardHeader title="Enterprise Channel Gates (ECG-0 to ECG-10)" />
      <ul className="divide-y divide-gray-50">
        {CHANNEL_GATES.map(gate => (
          <li key={gate.level} className="px-5 py-3 flex items-start gap-4">
            <span className="shrink-0 text-xs font-semibold text-indigo-600 w-14">{gate.code}</span>
            <div className="min-w-0">
              <p className="text-sm text-gray-800 font-medium">{gate.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{gate.description}</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}
