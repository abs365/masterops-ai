export type BusinessStage = 'Concept' | 'Building' | 'Pilot' | 'Live' | 'Growing' | 'Scaling' | 'Unspecified'

/**
 * Manually maintained Business Stage per enterprise, until real Enterprise
 * metadata (a proper data model for the portfolio) exists. Deliberately
 * NOT derived from MasterOps connection status -- a business can be Live
 * with zero technical monitoring connected, or in Building with full
 * monitoring wired up for testing. The two are independent.
 *
 * Left as 'Unspecified' for every entry below: no real stage is asserted
 * here without the Founder confirming it. Edit the values directly as
 * each business's actual stage is known or changes.
 */
export const BUSINESS_STAGE_CONFIG: Record<string, BusinessStage> = {
  'ELBOLD': 'Unspecified',
  'Master Growth OS': 'Unspecified',
  'Football Intelligence Group': 'Unspecified',
  'ChurchOS': 'Unspecified',
  'FamilyOS': 'Unspecified',
  'MeritBold': 'Unspecified',
}

export function businessStageFor(name: string): BusinessStage {
  return BUSINESS_STAGE_CONFIG[name] ?? 'Unspecified'
}
