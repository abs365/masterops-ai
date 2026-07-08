import { Card, CardHeader } from '@/components/ui/Card'
import { getIntegrationStatus, IntegrationState } from '@/lib/integration-status'

const stateStyle: Record<IntegrationState, string> = {
  connected: 'text-green-600 bg-green-50 border-green-200',
  not_configured: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  not_integrated: 'text-gray-400 bg-gray-50 border-gray-200',
}
const stateLabel: Record<IntegrationState, string> = {
  connected: 'Connected',
  not_configured: 'Not Configured',
  not_integrated: 'Not Integrated',
}

export function IntegrationStatus() {
  const rows = getIntegrationStatus()

  return (
    <Card padded={false}>
      <CardHeader title="Integration Status" />
      <ul className="divide-y divide-gray-50">
        {rows.map(row => (
          <li key={row.name} className="px-5 py-3 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm text-gray-800">{row.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{row.detail}</p>
            </div>
            <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border font-medium whitespace-nowrap ${stateStyle[row.state]}`}>
              {stateLabel[row.state]}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
