import { CostDashboard } from '@/components/costs/CostDashboard'

export default function CostsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Cost Monitoring</h2>
        <p className="text-sm text-gray-500 mt-0.5">Track API usage and estimated spend across all projects and providers</p>
      </div>
      <CostDashboard />
    </div>
  )
}
