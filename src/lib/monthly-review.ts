import { getEnterpriseKPIs } from '@/lib/enterprise-kpis'
import { getOnboardingSummary } from '@/lib/onboarding-status'
import { getReadinessSummary } from '@/lib/delivery-register'
import { SHARED_SERVICES_CATALOGUE } from '@/lib/shared-services-catalogue'

export interface MonthlyReviewSection {
  title: string
  lines: string[]
}

export interface MonthlyReview {
  period: string
  sections: MonthlyReviewSection[]
}

/**
 * Monthly Enterprise Review framework (EOP-001) — a fixed 4-section
 * structure (KPI Summary, Onboarding Progress, Delivery Readiness, Shared
 * Services Adoption), computed live from the same engines the KPI
 * framework and onboarding workflow already use. This is a live snapshot
 * of the current month, not a stored historical archive — EOP-001's "do
 * not add speculative functionality" constraint means no new table was
 * added to persist past reviews. Archiving reviews month over month is
 * future work, not built here.
 */
export async function getMonthlyReview(): Promise<MonthlyReview> {
  const [kpis, onboarding, readiness] = await Promise.all([
    getEnterpriseKPIs(),
    getOnboardingSummary(),
    getReadinessSummary(),
  ])

  const sharedServicesLive = SHARED_SERVICES_CATALOGUE.filter(
    s => s.readiness === 'Implemented' || s.readiness === 'Partially Implemented'
  ).length

  const period = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  return {
    period,
    sections: [
      {
        title: 'KPI Summary',
        lines: kpis.map(k => `${k.label}: ${k.value}`),
      },
      {
        title: 'Onboarding Progress',
        lines: [
          `${onboarding.fullyOnboarded} of ${onboarding.productCount} products fully onboarded`,
          `Average onboarding completion: ${onboarding.averageCompletionPct}%`,
        ],
      },
      {
        title: 'Delivery Readiness',
        lines: [
          `${readiness.liveCombinations} of ${readiness.totalCombinations} product-channel combinations live`,
          ...readiness.byChannel.map(c => `${c.channel}: ${c.liveCount} of ${c.totalProducts} products live`),
        ],
      },
      {
        title: 'Shared Services Adoption',
        lines: [`${sharedServicesLive} of ${SHARED_SERVICES_CATALOGUE.length} shared services live (Implemented or Partially Implemented)`],
      },
    ],
  }
}
