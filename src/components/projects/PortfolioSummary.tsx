import { Building2, CheckCircle, Compass, AlertTriangle } from 'lucide-react'
import { StatCard } from '@/components/dashboard/StatCard'
import { PortfolioSummaryData } from '@/lib/portfolio-workspace'

export function PortfolioSummary({ summary }: { summary: PortfolioSummaryData }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard title="Total Businesses" value={summary.total} icon={Building2} color="indigo" />
      <StatCard title="Active" value={summary.active} icon={CheckCircle} color="green" />
      <StatCard title="Planning" value={summary.planning} icon={Compass} color="default" />
      <StatCard
        title="Requiring Attention"
        value={summary.attention}
        icon={AlertTriangle}
        color={summary.attention > 0 ? 'red' : 'default'}
      />
    </div>
  )
}
