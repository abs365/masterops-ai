import { ProjectStatus, AlertSeverity } from '@/types'
import { statusColor, statusDot, severityColor } from '@/lib/utils'

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border font-medium ${statusColor(status)}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${statusDot(status)}`} />
      {status}
    </span>
  )
}

export function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  return (
    <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border font-medium ${severityColor(severity)}`}>
      {severity}
    </span>
  )
}
