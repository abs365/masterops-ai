import { PortfolioWorkspace } from '@/components/projects/PortfolioWorkspace'
import { RunCheckButton } from '@/components/projects/RunCheckButton'
import { OnboardingProgress } from '@/components/projects/OnboardingProgress'

export default function ProjectsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Portfolio Workspace</h2>
          <p className="text-sm text-gray-500 mt-0.5">Every business in the Enterprise, in one place</p>
        </div>
        <RunCheckButton />
      </div>
      <PortfolioWorkspace />
      <OnboardingProgress />
    </div>
  )
}
