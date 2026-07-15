import { Check, X } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { getOnboardingStatus, MANUAL_ONBOARDING_CHECKLIST } from '@/lib/onboarding-status'

export async function OnboardingProgress() {
  const statuses = await getOnboardingStatus()

  return (
    <Card padded={false}>
      <CardHeader title="Enterprise Product Onboarding" />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left font-semibold text-gray-700 px-5 py-3 whitespace-nowrap">Product</th>
              {statuses[0]?.checks.map(c => (
                <th key={c.label} className="text-left font-semibold text-gray-700 px-3 py-3 whitespace-nowrap">
                  {c.label}
                </th>
              ))}
              <th className="text-left font-semibold text-gray-700 px-3 py-3 whitespace-nowrap">Progress</th>
            </tr>
          </thead>
          <tbody>
            {statuses.map(status => (
              <tr key={status.slug} className="border-b border-gray-50 last:border-0">
                <td className="px-5 py-3 whitespace-nowrap text-gray-800 font-medium">{status.businessName}</td>
                {status.checks.map(check => (
                  <td key={check.label} className="px-3 py-3">
                    {check.complete ? (
                      <Check size={16} className="text-green-600" />
                    ) : (
                      <X size={16} className="text-gray-300" />
                    )}
                  </td>
                ))}
                <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">
                  {status.completedCount} of {status.totalChecks}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-5 py-4 border-t border-gray-100">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-2">
          Manual confirmation steps (per EIS-001 §9, not automatically verifiable)
        </p>
        <ul className="space-y-1">
          {MANUAL_ONBOARDING_CHECKLIST.map((item, i) => (
            <li key={i} className="text-xs text-gray-500">• {item}</li>
          ))}
        </ul>
      </div>
    </Card>
  )
}
