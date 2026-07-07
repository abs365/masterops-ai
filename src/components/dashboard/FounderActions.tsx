import { CheckSquare } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'

export function FounderActions() {
  return (
    <Card padded={false}>
      <CardHeader title="Founder Actions" />
      <EmptyState
        icon={CheckSquare}
        message="Founder Actions is not yet built. Once available, it will surface a short, ranked list of decisions that need your attention — not a raw alert feed."
      />
    </Card>
  )
}
