import { createClient } from '@/lib/supabase/server'
import { Alert } from '@/types'
import { timeAgo } from '@/lib/utils'
import { getDashboardStats } from '@/lib/dashboard-stats'
import { Card, CardHeader } from '@/components/ui/Card'
import { SeverityBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { ShieldCheck } from 'lucide-react'
import Link from 'next/link'

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

function CategoryRow({ label, sub, value }: { label: string; sub: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="px-5 py-3 flex items-center justify-between border-b border-gray-50 last:border-b-0">
      <div>
        <p className="text-sm text-gray-700">{label}</p>
        <p className="text-xs text-gray-400">{sub}</p>
      </div>
      {value}
    </div>
  )
}

export async function RiskOverview() {
  const [stats, alerts] = await Promise.all([getDashboardStats(), getOpenAlerts()])
  const systemWarnings = Math.max(stats.openAlerts - stats.criticalAlerts, 0)

  const countBadge = (n: number) => (
    <span className={`text-lg font-semibold ${n > 0 ? 'text-red-600' : 'text-gray-400'}`}>{n}</span>
  )
  const notTracked = <span className="text-xs text-gray-400">Not tracked here</span>

  return (
    <Card padded={false}>
      <CardHeader title="Risk Overview" />

      <div>
        <CategoryRow label="Security Alerts" sub="Critical & emergency security events" value={countBadge(stats.criticalSec)} />
        <CategoryRow label="System Warnings" sub="Open alerts below critical severity" value={countBadge(systemWarnings)} />
        <CategoryRow
          label="Deployment Issues"
          sub={<>Not summarized here — see <Link href="/deployments" className="text-indigo-600 hover:underline">Release &amp; Deployments</Link></>}
          value={notTracked}
        />
        <CategoryRow label="Failed Jobs" sub="No job-tracking capability exists in MasterOps yet" value={notTracked} />
      </div>

      <div className="border-t border-gray-100">
        <p className="px-5 pt-4 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Open Alerts</p>
        {alerts.length === 0 ? (
          <EmptyState icon={ShieldCheck} message="No open alerts — every alert is currently resolved or acknowledged." />
        ) : (
          <ul className="divide-y divide-gray-50">
            {alerts.map(alert => (
              <li key={alert.id} className="px-5 py-3 flex items-start gap-3">
                <span className="mt-0.5"><SeverityBadge severity={alert.severity} /></span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate">{alert.title}</p>
                  <p className="text-xs text-gray-400">{timeAgo(alert.created_at)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  )
}
