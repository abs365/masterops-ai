import { Card } from '@/components/ui/Card'
import { SharedServiceEntry, ServiceReadiness } from '@/lib/shared-services-catalogue'

const readinessStyle: Record<ServiceReadiness, string> = {
  'Implemented': 'text-green-700 bg-green-50 border-green-200',
  'Partially Implemented': 'text-yellow-700 bg-yellow-50 border-yellow-200',
  'Foundation Only': 'text-indigo-700 bg-indigo-50 border-indigo-200',
  'Not Started': 'text-gray-400 bg-gray-50 border-gray-200',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  )
}

export function ServiceCard({ service }: { service: SharedServiceEntry }) {
  const isBuilt = service.readiness === 'Implemented' || service.readiness === 'Partially Implemented'

  return (
    <Card className={`flex flex-col h-full ${isBuilt ? '' : 'border-dashed'}`}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-gray-900">{service.name}</h3>
        <span className={`shrink-0 whitespace-nowrap text-xs px-2 py-0.5 rounded-full border font-medium ${readinessStyle[service.readiness]}`}>
          {service.readiness}
        </span>
      </div>

      <p className="text-xs text-gray-500 mt-2">{service.purpose}</p>

      <div className="mt-4 space-y-3 text-xs flex-1">
        <Field label="Current Status">
          <p className={isBuilt ? 'text-gray-600' : 'text-gray-400 italic'}>{service.currentStatus}</p>
        </Field>
        <Field label="Intended Consumers">
          <ul className="space-y-0.5">
            {service.intendedConsumers.map((c, i) => (
              <li key={i} className="text-gray-500">• {c}</li>
            ))}
          </ul>
        </Field>
        <Field label="Future Roadmap">
          <p className="text-gray-400">{service.futureRoadmap}</p>
        </Field>
      </div>
    </Card>
  )
}
