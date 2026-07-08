import Link from 'next/link'
import { Rocket, GitBranch } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { timeAgo } from '@/lib/utils'
import { getVercelData, getGitHubData } from '@/lib/deployment-status'

function RepositoryStatus({ github }: { github: Awaited<ReturnType<typeof getGitHubData>> }) {
  if (!github.configured) {
    return (
      <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400">
        Repository Status: {github.message ?? 'GitHub is not connected.'}
      </div>
    )
  }

  const withRepo = github.projects.filter(p => p.repo)
  if (withRepo.length === 0) {
    return (
      <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400">
        Repository Status: {github.message ?? 'No projects have a repository configured yet.'}
      </div>
    )
  }

  const passing = withRepo.filter(p => p.workflow?.conclusion === 'success').length
  const failing = withRepo.filter(p => p.workflow?.conclusion === 'failure').length

  return (
    <div className="px-5 py-3 border-t border-gray-100 space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Repository Status</p>
      <div className="flex items-center gap-4 text-xs text-gray-600">
        <span className="inline-flex items-center gap-1"><GitBranch size={12} /> {withRepo.length} tracked</span>
        <span className={passing > 0 ? 'text-green-600' : 'text-gray-400'}>{passing} CI passing</span>
        <span className={failing > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>{failing} CI failing</span>
      </div>
    </div>
  )
}

export async function DeploymentSummary() {
  const [vercel, github] = await Promise.all([getVercelData(), getGitHubData()])
  const action = (
    <Link href="/deployments" className="text-xs text-indigo-600 hover:underline whitespace-nowrap">
      Full Release &amp; Deployment Centre →
    </Link>
  )

  if (!vercel.configured) {
    return (
      <Card padded={false}>
        <CardHeader title="Deployment Summary" action={action} />
        <EmptyState icon={Rocket} message={vercel.message ?? 'Vercel is not connected.'} />
        <RepositoryStatus github={github} />
      </Card>
    )
  }

  const withData = vercel.deployments.filter(d => d.deployment)

  if (withData.length === 0) {
    return (
      <Card padded={false}>
        <CardHeader title="Deployment Summary" action={action} />
        <EmptyState icon={Rocket} message={vercel.message ?? 'No deployments found yet.'} />
        <RepositoryStatus github={github} />
      </Card>
    )
  }

  const successful = withData.filter(d => d.deployment!.state === 'READY').length
  const failed = withData.filter(d => d.deployment!.state === 'ERROR').length
  const latest = [...withData].sort(
    (a, b) => new Date(b.deployment!.created_at).getTime() - new Date(a.deployment!.created_at).getTime()
  )[0]

  return (
    <Card padded={false}>
      <CardHeader title="Deployment Summary" action={action} />
      <div className="px-5 py-4 space-y-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-gray-900">{withData.length}</p>
            <p className="text-xs text-gray-400">Tracked Projects</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">{successful}</p>
            <p className="text-xs text-gray-400">Successful (latest)</p>
          </div>
          <div>
            <p className={`text-2xl font-bold ${failed > 0 ? 'text-red-600' : 'text-gray-300'}`}>{failed}</p>
            <p className="text-xs text-gray-400">Failed (latest)</p>
          </div>
        </div>
        {latest && (
          <p className="text-xs text-gray-500 border-t border-gray-100 pt-3">
            Latest deployment: <span className="font-medium text-gray-700">{latest.project_name}</span> — {latest.deployment!.state} · {timeAgo(latest.deployment!.created_at)}
          </p>
        )}
        <p className="text-[11px] text-gray-300">Showing the latest known deployment per project, not full history.</p>
      </div>
      <RepositoryStatus github={github} />
    </Card>
  )
}
