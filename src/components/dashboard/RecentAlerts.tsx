import { createClient } from '@/lib/supabase/server'
import { Alert } from '@/types'
import { severityColor, timeAgo } from '@/lib/utils'

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
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">Recent Alerts</h3>
      </div>
      {alerts.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-gray-400">No open alerts</div>
      ) : (
        <ul className="divide-y divide-gray-50">
          {alerts.map(alert => (
            <li key={alert.id} className="px-5 py-3 flex items-start gap-3">
              <span className={`mt-0.5 text-xs px-2 py-0.5 rounded-full border font-medium ${severityColor(alert.severity)}`}>
                {alert.severity}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 truncate">{alert.title}</p>
                <p className="text-xs text-gray-400">{timeAgo(alert.created_at)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
