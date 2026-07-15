import { getDashboardStats } from '@/lib/dashboard-stats'
import { getOnboardingSummary } from '@/lib/onboarding-status'
import { getReadinessSummary } from '@/lib/delivery-register'
import { getDailyFounderQueue } from '@/lib/daily-founder-queue'
import { SHARED_SERVICES_CATALOGUE } from '@/lib/shared-services-catalogue'
import { ENTERPRISE_REGISTRY } from '@/lib/enterprise-registry'

export interface EnterpriseKPI {
  slug: string
  label: string
  value: string
  sourceNote: string
}

/**
 * Enterprise KPI Framework (EOP-001) — every KPI here is read directly
 * from an existing Enterprise engine (Dashboard Stats, Onboarding Status,
 * Delivery Register/D-008, Shared Services Catalogue/D-007, the Daily
 * Founder Queue). No new metric source or computation is introduced;
 * this only assembles already-computed numbers into one KPI set.
 */
export async function getEnterpriseKPIs(): Promise<EnterpriseKPI[]> {
  const [stats, onboarding, readiness, queue] = await Promise.all([
    getDashboardStats(),
    getOnboardingSummary(),
    getReadinessSummary(),
    getDailyFounderQueue(),
  ])

  const sharedServicesLive = SHARED_SERVICES_CATALOGUE.filter(
    s => s.readiness === 'Implemented' || s.readiness === 'Partially Implemented'
  ).length

  return [
    {
      slug: 'products-registered',
      label: 'Enterprise Products Registered',
      value: String(ENTERPRISE_REGISTRY.length),
      sourceNote: 'Enterprise Registry (D-006)',
    },
    {
      slug: 'onboarding-completion',
      label: 'Onboarding Completion',
      value: `${onboarding.averageCompletionPct}%`,
      sourceNote: `Onboarding workflow — ${onboarding.fullyOnboarded} of ${onboarding.productCount} products fully onboarded`,
    },
    {
      slug: 'delivery-readiness',
      label: 'Delivery Readiness',
      value: `${readiness.liveCombinations} of ${readiness.totalCombinations}`,
      sourceNote: 'Enterprise Delivery Register (D-008), product-channel combinations live',
    },
    {
      slug: 'shared-services-live',
      label: 'Shared Services Live',
      value: `${sharedServicesLive} of ${SHARED_SERVICES_CATALOGUE.length}`,
      sourceNote: 'Enterprise Shared Services Foundation (D-007)',
    },
    {
      slug: 'founder-actions-open',
      label: 'Founder Actions Open Today',
      value: String(queue.length),
      sourceNote: 'Daily Founder Queue — Operations + Delivery combined',
    },
    {
      slug: 'critical-alerts',
      label: 'Critical Alerts Open',
      value: String(stats.criticalAlerts),
      sourceNote: 'Dashboard Stats — open critical/emergency alerts',
    },
  ]
}
