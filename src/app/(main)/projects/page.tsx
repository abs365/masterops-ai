import { ProjectsTable } from '@/components/projects/ProjectsTable'
import { RunCheckButton } from '@/components/projects/RunCheckButton'

export default function ProjectsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">All Projects</h2>
          <p className="text-sm text-gray-500 mt-0.5">Monitor health and status of every platform</p>
        </div>
        <RunCheckButton />
      </div>
      <ProjectsTable />
    </div>
  )
}
