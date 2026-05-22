import { createClient } from '@/lib/supabase/server'
import { SecurityEvent } from '@/types'
import { severityColor, timeAgo } from '@/lib/utils'

export async function SecurityEventsTable() {
  let events: SecurityEvent[] = []
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('security_events')
      .select('*, project:projects(name, slug)')
      .order('created_at', { ascending: false })
      .limit(50)
    events = (data as SecurityEvent[]) ?? []
  } catch { /* supabase not configured */ }

  if (events.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <p className="text-sm text-gray-400">No security events recorded yet.</p>
        <p className="text-xs text-gray-300 mt-1">Events are logged via <code className="bg-gray-100 px-1 rounded">/api/security/log-event</code></p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-xs text-gray-500 border-b border-gray-200">
            <th className="px-5 py-3 text-left font-medium">Severity</th>
            <th className="px-5 py-3 text-left font-medium">Event Type</th>
            <th className="px-5 py-3 text-left font-medium">Description</th>
            <th className="px-5 py-3 text-left font-medium">IP</th>
            <th className="px-5 py-3 text-left font-medium">Time</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {events.map(e => (
            <tr key={e.id} className="hover:bg-gray-50">
              <td className="px-5 py-3">
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${severityColor((e.severity as 'info') ?? 'info')}`}>
                  {e.severity ?? 'info'}
                </span>
              </td>
              <td className="px-5 py-3 text-gray-700">{e.event_type ?? '—'}</td>
              <td className="px-5 py-3 text-gray-600 max-w-xs truncate">{e.description ?? '—'}</td>
              <td className="px-5 py-3 text-gray-400 font-mono text-xs">{e.ip_address ?? '—'}</td>
              <td className="px-5 py-3 text-gray-400">{timeAgo(e.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
