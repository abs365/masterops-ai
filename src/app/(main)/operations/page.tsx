import { OperationsSummary } from '@/components/operations/OperationsSummary'
import { PlatformHealth } from '@/components/operations/PlatformHealth'
import { DeploymentSummary } from '@/components/operations/DeploymentSummary'
import { IntegrationStatus } from '@/components/operations/IntegrationStatus'
import { AlertsCentre } from '@/components/operations/AlertsCentre'
import { FounderActionQueue } from '@/components/operations/FounderActionQueue'
import { CostSummary } from '@/components/operations/CostSummary'
import { BackupSummary } from '@/components/operations/BackupSummary'

export const dynamic = 'force-dynamic'

export default function OperationsPage() {
  return (
    <div className="space-y-6">
      <OperationsSummary />
      <PlatformHealth />
      <FounderActionQueue />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DeploymentSummary />
        <IntegrationStatus />
      </div>
      <AlertsCentre />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CostSummary />
        <BackupSummary />
      </div>
    </div>
  )
}
