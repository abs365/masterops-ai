import { ServiceCard } from '@/components/shared-services/ServiceCard'
import { SHARED_SERVICES_CATALOGUE } from '@/lib/shared-services-catalogue'
import { ENTERPRISE_REGISTRY } from '@/lib/enterprise-registry'

export const dynamic = 'force-dynamic'

export default function SharedServicesPage() {
  const implemented = SHARED_SERVICES_CATALOGUE.filter(
    s => s.readiness === 'Implemented' || s.readiness === 'Partially Implemented'
  ).length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Shared Services</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          The shared Enterprise capability layer available to all {ENTERPRISE_REGISTRY.length} registered Enterprise
          businesses, current and future. {implemented} of {SHARED_SERVICES_CATALOGUE.length} services are live today
          — the rest are documented foundations, not yet built.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {SHARED_SERVICES_CATALOGUE.map(service => (
          <ServiceCard key={service.slug} service={service} />
        ))}
      </div>
    </div>
  )
}
