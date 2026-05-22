import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { ProjectStatus, AlertSeverity } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function statusColor(status: ProjectStatus): string {
  const map: Record<ProjectStatus, string> = {
    online: 'text-green-600 bg-green-50 border-green-200',
    slow: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    warning: 'text-orange-600 bg-orange-50 border-orange-200',
    down: 'text-red-600 bg-red-50 border-red-200',
    unknown: 'text-gray-500 bg-gray-50 border-gray-200',
  }
  return map[status]
}

export function statusDot(status: ProjectStatus): string {
  const map: Record<ProjectStatus, string> = {
    online: 'bg-green-500',
    slow: 'bg-yellow-500',
    warning: 'bg-orange-500',
    down: 'bg-red-500',
    unknown: 'bg-gray-400',
  }
  return map[status]
}

export function severityColor(severity: AlertSeverity): string {
  const map: Record<AlertSeverity, string> = {
    info: 'text-blue-600 bg-blue-50 border-blue-200',
    warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    critical: 'text-red-600 bg-red-50 border-red-200',
    emergency: 'text-white bg-red-700 border-red-800',
  }
  return map[severity]
}

export function formatMs(ms: number | null): string {
  if (ms === null) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

export function formatCost(cost: number): string {
  return `$${cost.toFixed(4)}`
}

export function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}
