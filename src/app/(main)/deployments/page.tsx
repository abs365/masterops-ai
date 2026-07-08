import { DeploymentsTable } from '@/components/deployments/DeploymentsTable'
import { GitHubStatusTable } from '@/components/deployments/GitHubStatusTable'
import { getVercelData, getGitHubData } from '@/lib/deployment-status'

export const dynamic = 'force-dynamic'

export default async function DeploymentsPage() {
  const [vercel, github] = await Promise.all([getVercelData(), getGitHubData()])

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Deployments</h2>
        <p className="text-sm text-gray-500 mt-0.5">Vercel deployment status and GitHub workflow health for all projects</p>
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">Vercel Deployments</h3>
        <DeploymentsTable {...vercel} />
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">GitHub Repository Status</h3>
        <GitHubStatusTable {...github} />
      </section>
    </div>
  )
}
