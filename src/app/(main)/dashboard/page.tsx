import { ExecutiveSummary } from '@/components/dashboard/ExecutiveSummary'
import { FounderActionCentre } from '@/components/dashboard/FounderActionCentre'
import { RiskOverview } from '@/components/dashboard/RiskOverview'
import { PortfolioHealth } from '@/components/dashboard/PortfolioHealth'
import { OpportunityIntelligence } from '@/components/dashboard/OpportunityIntelligence'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <ExecutiveSummary />
      <FounderActionCentre />
      <RiskOverview />
      <PortfolioHealth />
      <OpportunityIntelligence />
    </div>
  )
}
