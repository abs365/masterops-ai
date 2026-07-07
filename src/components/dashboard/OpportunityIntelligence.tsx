import { TrendingUp } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'

export function OpportunityIntelligence() {
  return (
    <Card padded={false}>
      <CardHeader title="Opportunity Intelligence" />
      <EmptyState
        icon={TrendingUp}
        message="No opportunity data exists yet — MasterOps has no lead or pipeline source connected. Once one is, portfolio-wide opportunities will appear here."
        action={{ label: 'View Opportunity Intelligence', href: '/leads' }}
      />
    </Card>
  )
}
