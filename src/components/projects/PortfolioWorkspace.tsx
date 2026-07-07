import { getPortfolioWorkspace } from '@/lib/portfolio-workspace'
import { PortfolioSummary } from '@/components/projects/PortfolioSummary'
import { EnterpriseCard } from '@/components/projects/EnterpriseCard'

export async function PortfolioWorkspace() {
  const { cards, summary } = await getPortfolioWorkspace()

  return (
    <div className="space-y-6">
      <PortfolioSummary summary={summary} />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {cards.map(card => (
          <EnterpriseCard key={card.name} card={card} />
        ))}
      </div>
    </div>
  )
}
