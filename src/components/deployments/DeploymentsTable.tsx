import { timeAgo } from '@/lib/utils'
import { ExternalLink, CheckCircle, XCircle, Clock, Loader } from 'lucide-react'

interface Deployment {
  project_name: string
  project_slug: string
  vercel_project_id: string | null
  deployment: {
    uid: string
    state: string
    url: string
    created_at: string
  } | null
}

interface Props {
  configured: boolean
  message?: string
  deployments: Deployment[]
}

function StateIcon({ state }: { state: string }) {
  if (state === 'READY') return <CheckCircle size={14} className="text-green-500" />
  if (state === 'ERROR') return <XCircle size={14} className="text-red-500" />
  if (state === 'BUILDING' || state === 'INITIALIZING') return <Loader size={14} className="text-yellow-500 animate-spin" />
  return <Clock size={14} className="text-gray-400" />
}

function stateLabel(state: string): { label: string; cls: string } {
  if (state === 'READY') return { label: 'Ready', cls: 'text-green-600 bg-green-50 border-green-200' }
  if (state === 'ERROR') return { label: 'Failed', cls: 'text-red-600 bg-red-50 border-red-200' }
  if (state === 'BUILDING') return { label: 'Building', cls: 'text-yellow-600 bg-yellow-50 border-yellow-200' }
  if (state === 'CANCELED') return { label: 'Cancelled', cls: 'text-gray-500 bg-gray-50 border-gray-200' }
  return { label: state, cls: 'text-gray-500 bg-gray-50 border-gray-200' }
}

export function DeploymentsTable({ configured, message, deployments }: Props) {
  if (!configured) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 space-y-3">
        <p className="text-sm font-medium text-gray-600">Vercel token not connected</p>
        <p className="text-xs text-gray-400">{message}</p>
        <ol className="text-xs text-gray-500 space-y-1 list-decimal list-inside">
          <li>Go to vercel.com → Settings → Tokens → Create token</li>
          <li>Add <code className="bg-gray-100 px-1 rounded">VERCEL_TOKEN=your_token</code> to .env.local</li>
          <li>In Supabase, add <code className="bg-gray-100 px-1 rounded">vercel_project_id</code> for each project</li>
          <li>Optionally add <code className="bg-gray-100 px-1 rounded">VERCEL_TEAM_ID</code> if using a team account</li>
        </ol>
      </div>
    )
  }

  if (deployments.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <p className="text-sm text-gray-400">{message ?? 'No deployments found.'}</p>
        <p className="text-xs text-gray-300 mt-1">Add vercel_project_id to each project row in Supabase to enable tracking.</p>
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
            <th className="px-5 py-3 text-left font-medium">Deployed</th>
            <th className="px-5 py-3 text-left font-medium">URL</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {deployments.map((d) => {
            const { label, cls } = d.deployment ? stateLabel(d.deployment.state) : { label: 'No data', cls: 'text-gray-300 bg-white border-gray-100' }
            return (
              <tr key={d.project_slug} className="hover:bg-gray-50">
                <td className="px-5 py-4">
                  <p className="font-semibold text-gray-900">{d.project_name}</p>
                  <p className="text-xs text-gray-400">{d.project_slug}</p>
                </td>
                <td className="px-5 py-4">
                  <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${cls}`}>
                    {d.deployment && <StateIcon state={d.deployment.state} />}
                    {label}
                  </span>
                </td>
                <td className="px-5 py-4 text-gray-400">
                  {d.deployment ? timeAgo(d.deployment.created_at) : '—'}
                </td>
                <td className="px-5 py-4">
                  {d.deployment ? (
                    <a
                      href={d.deployment.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-500 hover:text-indigo-700 inline-flex items-center gap-1 text-xs"
                    >
                      <ExternalLink size={12} />
                      Open
                    </a>
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
