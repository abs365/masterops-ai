import { createClient } from '@/lib/supabase/server'
import { Alert } from '@/types'
import { timeAgo } from '@/lib/utils'
import { Card, CardHeader } from '@/components/ui/Card'
import { SeverityBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { ShieldCheck } from 'lucide-react'

async function getOpenAlerts(): Promise<Alert[]> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('alerts')
      .select('*, project:projects(name, slug)')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(8)
    return (data as Alert[]) ?? []
  } catch {
    return []
  }
}

export async function AlertsCentre() {
  const alerts = await getOpenAlerts()
  const critical = alerts.filter(a => a.severity === 'critical' || a.severity === 'emergency').length
  const warning = alerts.filter(a => a.severity === 'warning').length
  const information = alerts.filter(a => a.severity === 'info').length

  const countBadge = (n: number, tone: 'red' | 'yellow' | 'gray') => (
    <span
      className={`text-lg font-semibold ${
        n === 0 ? 'text-gray-400' : tone === 'red' ? 'text-red-600' : tone === 'yellow' ? 'text-yellow-600' : 'text-gray-600'
      }`}
    >
      {n}
    </span>
  )

  return (
    <Card padded={false}>
      <CardHeader title="Alerts Centre" />
      <div className="grid grid-cols-3 divide-x divide-gray-50 border-b border-gray-100">
        <div className="px-5 py-3 text-center">
          <p className="text-xs text-gray-400 mb-1">Critical</p>
          {countBadge(critical, 'red')}
        </div>
        <div className="px-5 py-3 text-center">
          <p className="text-xs text-gray-400 mb-1">Warning</p>
          {countBadge(warning, 'yellow')}
        </div>
        <div className="px-5 py-3 text-center">
          <p className="text-xs text-gray-400 mb-1">Information</p>
          {countBadge(information, 'gray')}
        </div>
      </div>
      {alerts.length === 0 ? (
        <EmptyState icon={ShieldCheck} message="No open alerts across the Enterprise." />
      ) : (
        <ul className="divide-y divide-gray-50">
          {alerts.map(alert => (
            <li key={alert.id} className="px-5 py-3 flex items-start gap-3">
              <span className="mt-0.5">
                <SeverityBadge severity={alert.severity} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 truncate">{alert.title}</p>
                <p className="text-xs text-gray-400">{alert.project?.name ?? 'Unassigned'} · {timeAgo(alert.created_at)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
