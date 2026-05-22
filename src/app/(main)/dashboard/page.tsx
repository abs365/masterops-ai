import { DashboardCards } from '@/components/dashboard/DashboardCards'
import { RecentAlerts } from '@/components/dashboard/RecentAlerts'
import { ProjectStatusTable } from '@/components/dashboard/ProjectStatusTable'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <DashboardCards />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentAlerts />
        <ProjectStatusTable />
      </div>
    </div>
  )
}
