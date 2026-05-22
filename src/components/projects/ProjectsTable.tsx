import { createClient } from '@/lib/supabase/server'
import { Project } from '@/types'
import { statusColor, statusDot, formatMs, timeAgo } from '@/lib/utils'
import { ExternalLink } from 'lucide-react'

export async function ProjectsTable() {
  let projects: Project[] = []
  try {
    const supabase = await createClient()
    const { data } = await supabase.from('projects').select('*').order('name')
    projects = (data as Project[]) ?? []
  } catch { /* supabase not configured */ }

  if (projects.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <p className="text-sm text-gray-400">No projects found. Run the Supabase migration to seed your projects.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-xs text-gray-500 border-b border-gray-200">
            <th className="px-5 py-3 text-left font-medium">Project</th>
            <th className="px-5 py-3 text-left font-medium">Status</th>
            <th className="px-5 py-3 text-left font-medium">Response</th>
            <th className="px-5 py-3 text-left font-medium">Last Checked</th>
            <th className="px-5 py-3 text-left font-medium">URL</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {projects.map(p => (
            <tr key={p.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-5 py-4">
                <p className="font-semibold text-gray-900">{p.name}</p>
                <p className="text-xs text-gray-400">{p.slug}</p>
              </td>
              <td className="px-5 py-4">
                <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${statusColor(p.status)}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusDot(p.status)}`} />
                  {p.status}
                </span>
              </td>
              <td className="px-5 py-4 text-gray-600">{formatMs(p.response_time_ms)}</td>
              <td className="px-5 py-4 text-gray-400">{timeAgo(p.last_checked_at)}</td>
              <td className="px-5 py-4">
                {p.url ? (
                  <a href={p.url} target="_blank" rel="noreferrer"
                    className="text-indigo-500 hover:text-indigo-700 inline-flex items-center gap-1">
                    <ExternalLink size={12} />
                    <span className="text-xs">Visit</span>
                  </a>
                ) : (
                  <span className="text-xs text-gray-300">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
