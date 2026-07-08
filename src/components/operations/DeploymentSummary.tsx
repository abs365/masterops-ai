import Link from 'next/link'
import { Rocket } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { timeAgo } from '@/lib/utils'
import { getVercelData } from '@/lib/deployment-status'

export async function DeploymentSummary() {
  const vercel = await getVercelData()
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
      </Card>
    )
  }

  const withData = vercel.deployments.filter(d => d.deployment)

  if (withData.length === 0) {
    return (
      <Card padded={false}>
        <CardHeader title="Deployment Summary" action={action} />
        <EmptyState icon={Rocket} message={vercel.message ?? 'No deployments found yet.'} />
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
    </Card>
  )
}
