import { createClient } from '@/lib/supabase/server'
import { Project } from '@/types'
import { statusColor, statusDot, formatMs, timeAgo } from '@/lib/utils'

export async function ProjectStatusTable() {
  let projects: Project[] = []
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('projects')
      .select('*')
      .order('name')
    projects = (data as Project[]) ?? []
  } catch { /* supabase not configured */ }

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">Project Status</h3>
      </div>
      {projects.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-gray-400">No projects yet — run the Supabase migration</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 border-b border-gray-100">
              <th className="px-5 py-2 text-left font-medium">Project</th>
              <th className="px-5 py-2 text-left font-medium">Status</th>
              <th className="px-5 py-2 text-left font-medium">Response</th>
              <th className="px-5 py-2 text-left font-medium">Checked</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {projects.map(p => (
              <tr key={p.id}>
                <td className="px-5 py-3 font-medium text-gray-800">{p.name}</td>
                <td className="px-5 py-3">
                  <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border font-medium ${statusColor(p.status)}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusDot(p.status)}`} />
                    {p.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-500">{formatMs(p.response_time_ms)}</td>
                <td className="px-5 py-3 text-gray-400">{timeAgo(p.last_checked_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
