import { getPortfolioWorkspace } from '@/lib/portfolio-workspace'
import { ENTERPRISE_REGISTRY } from '@/lib/enterprise-registry'

export interface OnboardingCheck {
  label: string
  complete: boolean
}

export interface ProductOnboardingStatus {
  slug: string
  businessName: string
  checks: OnboardingCheck[]
  completedCount: number
  totalChecks: number
}

/**
 * Enterprise Product Onboarding workflow (EOP-001) — turns the Enterprise
 * Integration Standard's (EIS-001 §9) 10-item checklist into a live,
 * per-product status instead of a static document. Only the first 5
 * checklist items are objectively verifiable from data MasterOps already
 * has (Enterprise Registry + `projects` table, via the existing
 * `getPortfolioWorkspace()` — no new query is added). The remaining 5 are
 * process/governance confirmations that only a Founder review can settle
 * (e.g. "reviewed with the Founder") — computing a fake true/false for
 * those would invent data EIS-001 explicitly forbids, so they stay a
 * reusable static reminder list instead (see
 * `MANUAL_ONBOARDING_CHECKLIST`).
 */
export const MANUAL_ONBOARDING_CHECKLIST: string[] = [
  'Enterprise Registry progressive fields reviewed with the Founder (owner, contacts, category — filled in or explicitly left null, never guessed)',
  'Boundary Standard (EIS-001 §7) confirmed — no Business or Growth Signal is being routed to MasterOps',
  'Decision recorded on whether cost/alert push integration is worth building for this business, or explicitly deferred',
  'Evidence package written and approved (Plan → Assure → Approve → Implement → Verify, per EIS-001 §8)',
  'Baseline recorded',
]

export async function getOnboardingStatus(): Promise<ProductOnboardingStatus[]> {
  const portfolio = await getPortfolioWorkspace()

  return ENTERPRISE_REGISTRY.map(profile => {
    const card = portfolio.cards.find(c => c.profile.slug === profile.slug)
    const project = card?.project ?? null

    const checks: OnboardingCheck[] = [
      { label: 'Enterprise Registry entry', complete: true },
      { label: '`projects` row registered', complete: project !== null },
      { label: 'Vercel project linked', complete: !!project?.vercel_project_id },
      { label: 'GitHub repository linked', complete: !!project?.github_repo },
      { label: 'Monitor cron has checked at least once', complete: !!project?.last_checked_at },
    ]

    return {
      slug: profile.slug,
      businessName: profile.businessName,
      checks,
      completedCount: checks.filter(c => c.complete).length,
      totalChecks: checks.length,
    }
  })
}

export interface OnboardingSummary {
  productCount: number
  averageCompletionPct: number
  fullyOnboarded: number
}

export async function getOnboardingSummary(): Promise<OnboardingSummary> {
  const statuses = await getOnboardingStatus()
  if (statuses.length === 0) return { productCount: 0, averageCompletionPct: 0, fullyOnboarded: 0 }

  const totalPct = statuses.reduce((sum, s) => sum + s.completedCount / s.totalChecks, 0)
  return {
    productCount: statuses.length,
    averageCompletionPct: Math.round((totalPct / statuses.length) * 100),
    fullyOnboarded: statuses.filter(s => s.completedCount === s.totalChecks).length,
  }
}
