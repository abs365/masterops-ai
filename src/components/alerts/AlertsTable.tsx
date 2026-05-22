import { createClient } from '@/lib/supabase/server'
import { Alert } from '@/types'
import { severityColor, timeAgo } from '@/lib/utils'

export async function AlertsTable() {
  let alerts: Alert[] = []
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('alerts')
      .select('*, project:projects(name, slug)')
      .order('created_at', { ascending: false })
      .limit(50)
    alerts = (data as Alert[]) ?? []
  } catch { /* supabase not configured */ }

  if (alerts.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <p className="text-sm text-gray-400">No alerts yet — connect your projects to start monitoring.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-xs text-gray-500 border-b border-gray-200">
            <th className="px-5 py-3 text-left font-medium">Severity</th>
            <th className="px-5 py-3 text-left font-medium">Title</th>
            <th className="px-5 py-3 text-left font-medium">Message</th>
            <th className="px-5 py-3 text-left font-medium">Status</th>
            <th className="px-5 py-3 text-left font-medium">Time</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {alerts.map(a => (
            <tr key={a.id} className="hover:bg-gray-50">
              <td className="px-5 py-3">
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${severityColor(a.severity)}`}>
                  {a.severity}
                </span>
              </td>
              <td className="px-5 py-3 font-medium text-gray-800">{a.title}</td>
              <td className="px-5 py-3 text-gray-500 max-w-xs truncate">{a.message ?? '—'}</td>
              <td className="px-5 py-3">
                <span className={`text-xs px-2 py-0.5 rounded-full border ${
                  a.status === 'open' ? 'text-red-600 bg-red-50 border-red-200' :
                  a.status === 'acknowledged' ? 'text-yellow-600 bg-yellow-50 border-yellow-200' :
                  'text-green-600 bg-green-50 border-green-200'
                }`}>
                  {a.status}
                </span>
              </td>
              <td className="px-5 py-3 text-gray-400">{timeAgo(a.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
