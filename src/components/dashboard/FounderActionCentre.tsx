import { CheckSquare, ClipboardCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Alert, AlertSeverity } from '@/types'
import { timeAgo } from '@/lib/utils'
import { Card, CardHeader } from '@/components/ui/Card'
import { SeverityBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'

const severityRank: Record<AlertSeverity, number> = { emergency: 0, critical: 1, warning: 2, info: 3 }

async function getImmediateActions(): Promise<Alert[]> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('alerts')
      .select('*, project:projects(name, slug)')
      .eq('status', 'open')
      .in('severity', ['critical', 'emergency'])
      .order('created_at', { ascending: false })
      .limit(10)

    const alerts = (data as Alert[]) ?? []
    return alerts.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]).slice(0, 5)
  } catch {
    return []
  }
}

export async function FounderActionCentre() {
  const actions = await getImmediateActions()

  return (
    <Card padded={false} className="border-2 border-indigo-100">
      <CardHeader title="Founder Action Centre" />
      <div className="divide-y divide-gray-50">
        <div>
          <p className="px-5 pt-4 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Immediate Actions
          </p>
          {actions.length === 0 ? (
            <EmptyState icon={CheckSquare} message="Nothing needs immediate action right now — no open critical or emergency alerts." />
          ) : (
            <ul className="divide-y divide-gray-50">
              {actions.map(alert => (
                <li key={alert.id} className="px-5 py-3 flex items-start gap-3">
                  <span className="mt-0.5"><SeverityBadge severity={alert.severity} /></span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">{alert.title}</p>
                    <p className="text-xs text-gray-400">
                      {alert.project?.name ? `${alert.project.name} · ` : ''}{timeAgo(alert.created_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="px-5 pt-4 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Pending Approvals
          </p>
          <EmptyState
            icon={ClipboardCheck}
            message="No approval workflow exists in MasterOps yet — this section will populate once one is built."
          />
        </div>
      </div>
    </Card>
  )
}
