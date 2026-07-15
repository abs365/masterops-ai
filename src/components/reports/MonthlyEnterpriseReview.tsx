import { Card, CardHeader } from '@/components/ui/Card'
import { getMonthlyReview } from '@/lib/monthly-review'

export async function MonthlyEnterpriseReview() {
  const review = await getMonthlyReview()

  return (
    <Card padded={false}>
      <CardHeader title={`Monthly Enterprise Review — ${review.period}`} />
      <p className="px-5 pt-3 text-xs text-gray-400">
        A live snapshot of the current month, assembled from the Enterprise KPI, Onboarding, Delivery, and Shared
        Services engines. Not a stored historical record — each visit reflects today&apos;s state.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5">
        {review.sections.map(section => (
          <div key={section.title} className="rounded-lg border border-gray-100 p-4">
            <p className="text-sm font-semibold text-gray-900 mb-2">{section.title}</p>
            <ul className="space-y-1">
              {section.lines.map((line, i) => (
                <li key={i} className="text-xs text-gray-500">• {line}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  )
}
