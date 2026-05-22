import { timeAgo } from '@/lib/utils'
import { CheckCircle, XCircle, Clock, GitBranch } from 'lucide-react'

interface WorkflowRun {
  name: string
  status: string
  conclusion: string | null
  created_at: string
}

interface GitHubProject {
  project_name: string
  project_slug: string
  repo: string | null
  default_branch: string | null
  updated_at: string | null
  workflow: WorkflowRun | null
}

interface Props {
  configured: boolean
  message?: string
  projects: GitHubProject[]
}

function ConclusionBadge({ run }: { run: WorkflowRun | null }) {
  if (!run) return <span className="text-xs text-gray-300">No runs</span>
  if (run.status !== 'completed') {
    return <span className="text-xs px-2 py-0.5 rounded-full border text-yellow-600 bg-yellow-50 border-yellow-200">In progress</span>
  }
  if (run.conclusion === 'success') {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border text-green-600 bg-green-50 border-green-200">
        <CheckCircle size={10} /> Passed
      </span>
    )
  }
  if (run.conclusion === 'failure') {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border text-red-600 bg-red-50 border-red-200">
        <XCircle size={10} /> Failed
      </span>
    )
  }
  return <span className="text-xs px-2 py-0.5 rounded-full border text-gray-500 bg-gray-50 border-gray-200">{run.conclusion ?? run.status}</span>
}

export function GitHubStatusTable({ configured, message, projects }: Props) {
  if (!configured) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
        <p className="text-sm font-medium text-gray-600">GitHub not connected</p>
        <p className="text-xs text-gray-400">{message}</p>
        <ol className="text-xs text-gray-500 space-y-1 list-decimal list-inside">
          <li>Go to github.com → Settings → Developer settings → Personal access tokens → Fine-grained</li>
          <li>Grant read access to: Repository metadata, Actions (read)</li>
          <li>Add <code className="bg-gray-100 px-1 rounded">GITHUB_TOKEN=your_token</code> to .env.local</li>
          <li>In Supabase, add <code className="bg-gray-100 px-1 rounded">github_repo</code> column for each project (format: <code className="bg-gray-100 px-1 rounded">owner/repo</code>)</li>
        </ol>
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
        <p className="text-sm text-gray-400">{message ?? 'No projects with GitHub repos configured.'}</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-xs text-gray-500 border-b border-gray-200">
            <th className="px-5 py-3 text-left font-medium">Project</th>
            <th className="px-5 py-3 text-left font-medium">Branch</th>
            <th className="px-5 py-3 text-left font-medium">CI Status</th>
            <th className="px-5 py-3 text-left font-medium">Workflow</th>
            <th className="px-5 py-3 text-left font-medium">Last Push</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {projects.map((p) => (
            <tr key={p.project_slug} className="hover:bg-gray-50">
              <td className="px-5 py-4">
                <p className="font-semibold text-gray-900">{p.project_name}</p>
                <p className="text-xs text-gray-400 font-mono">{p.repo}</p>
              </td>
              <td className="px-5 py-4">
                {p.default_branch ? (
                  <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                    <GitBranch size={11} /> {p.default_branch}
                  </span>
                ) : <span className="text-gray-300 text-xs">—</span>}
              </td>
              <td className="px-5 py-4"><ConclusionBadge run={p.workflow} /></td>
              <td className="px-5 py-4 text-xs text-gray-500">{p.workflow?.name ?? '—'}</td>
              <td className="px-5 py-4 text-xs text-gray-400">{p.updated_at ? timeAgo(p.updated_at) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
