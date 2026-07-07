import { createClient } from '@/lib/supabase/server'
import { Alert } from '@/types'
import { timeAgo } from '@/lib/utils'
import { Card, CardHeader } from '@/components/ui/Card'
import { SeverityBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { ShieldCheck } from 'lucide-react'

export async function RecentAlerts() {
  let alerts: Alert[] = []
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('alerts')
      .select('*, project:projects(name, slug)')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(8)
    alerts = (data as Alert[]) ?? []
  } catch { /* supabase not configured */ }

  return (
    <Card padded={false}>
      <CardHeader title="Risks" />
      {alerts.length === 0 ? (
        <EmptyState icon={ShieldCheck} message="No open risks — every open alert is currently resolved or acknowledged." />
      ) : (
        <ul className="divide-y divide-gray-50">
          {alerts.map(alert => (
            <li key={alert.id} className="px-5 py-3 flex items-start gap-3">
              <span className="mt-0.5">
                <SeverityBadge severity={alert.severity} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 truncate">{alert.title}</p>
                <p className="text-xs text-gray-400">{timeAgo(alert.created_at)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
