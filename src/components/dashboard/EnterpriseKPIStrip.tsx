import { Card, CardHeader } from '@/components/ui/Card'
import { getEnterpriseKPIs } from '@/lib/enterprise-kpis'

export async function EnterpriseKPIStrip() {
  const kpis = await getEnterpriseKPIs()

  return (
    <Card padded={false}>
      <CardHeader title="Enterprise KPIs" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 divide-gray-50">
        {kpis.map(kpi => (
          <div key={kpi.slug} className="px-5 py-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{kpi.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{kpi.value}</p>
            <p className="text-xs text-gray-400 mt-1">{kpi.sourceNote}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}
