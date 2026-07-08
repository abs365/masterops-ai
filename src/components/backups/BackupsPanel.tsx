import { HardDrive, CheckCircle, AlertCircle, HelpCircle } from 'lucide-react'
import { timeAgo } from '@/lib/utils'
import { getBackupData } from '@/lib/backup-status'

function BackupStatusIcon({ status }: { status: string }) {
  if (status === 'available') return <CheckCircle size={14} className="text-green-500" />
  if (status === 'fetch_error') return <AlertCircle size={14} className="text-red-500" />
  return <HelpCircle size={14} className="text-gray-300" />
}

function BackupBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    available: 'text-green-600 bg-green-50 border-green-200',
    manual_check_required: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    not_configured: 'text-gray-400 bg-gray-50 border-gray-200',
    fetch_error: 'text-red-600 bg-red-50 border-red-200',
    no_backups_found: 'text-orange-600 bg-orange-50 border-orange-200',
  }
  const labels: Record<string, string> = {
    available: 'Available',
    manual_check_required: 'Manual check',
    not_configured: 'Not linked',
    fetch_error: 'Error',
    no_backups_found: 'No backups',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${map[status] ?? map.not_configured}`}>
      {labels[status] ?? status}
    </span>
  )
}

export async function BackupsPanel() {
  const { configured, projects } = await getBackupData()

  return (
    <div className="space-y-4">
      {!configured && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          Automated backup checks require <code className="font-mono text-xs bg-yellow-100 px-1 rounded">SUPABASE_ACCESS_TOKEN</code> and <code className="font-mono text-xs bg-yellow-100 px-1 rounded">SUPABASE_ORG_ID</code>.
          Until then, check backups manually in each Supabase dashboard under <strong>Database → Backups</strong>.
        </div>
      )}

      {projects.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <HardDrive size={32} className="text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No projects registered yet.</p>
          <p className="text-xs text-gray-300 mt-1">Run migration 001 in Supabase to seed project data.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 border-b border-gray-200">
                <th className="px-5 py-3 text-left font-medium">Project</th>
                <th className="px-5 py-3 text-left font-medium">Supabase ID</th>
                <th className="px-5 py-3 text-left font-medium">Backup Status</th>
                <th className="px-5 py-3 text-left font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {projects.map(p => (
                <tr key={p.slug} className="hover:bg-gray-50">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.slug}</p>
                  </td>
                  <td className="px-5 py-4 font-mono text-xs text-gray-500">
                    {p.supabase_project_id ?? <span className="text-gray-300">Not set</span>}
                  </td>
                  <td className="px-5 py-4">
                    <BackupBadge status={p.supabase_project_id ? (configured ? 'available' : 'manual_check_required') : 'not_configured'} />
                  </td>
                  <td className="px-5 py-4">
                    {p.supabase_project_id ? (
                      <a
                        href={`https://supabase.com/dashboard/project/${p.supabase_project_id}/database/backups`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-indigo-500 hover:text-indigo-700"
                      >
                        Check in Supabase →
                      </a>
                    ) : (
                      <span className="text-xs text-gray-300">Add supabase_project_id in DB</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-2">
        <p className="text-xs font-semibold text-gray-600">Manual Backup Check Instructions</p>
        <ol className="text-xs text-gray-500 space-y-1 list-decimal list-inside">
          <li>Go to <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-indigo-500">supabase.com/dashboard</a></li>
          <li>Open each project → Database → Backups</li>
          <li>Confirm daily backups are running (Pro plan required for point-in-time recovery)</li>
          <li>Download a manual backup if needed before any major migration</li>
        </ol>
        <p className="text-xs text-gray-400 mt-1">
          To enable automated checks: add <code className="bg-gray-100 px-1 rounded">SUPABASE_ACCESS_TOKEN</code> (from supabase.com → Account → Access Tokens) and <code className="bg-gray-100 px-1 rounded">SUPABASE_ORG_ID</code> (from your org settings) to .env.local.
        </p>
      </div>
    </div>
  )
}
