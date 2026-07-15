export type BusinessStage = 'Concept' | 'Building' | 'Pilot' | 'Live' | 'Growing' | 'Scaling' | 'Unspecified'

export interface EnterpriseProfile {
  slug: string
  businessName: string
  shortDescription: string | null
  businessStage: BusinessStage
  businessOwner: string | null
  primaryWebsite: string | null
  productionUrl: string | null
  developmentUrl: string | null
  gitRepository: string | null
  documentationLocation: string | null
  primaryContact: string | null
  supportContact: string | null
  businessCategory: string | null
  dateAdded: string
  lastReviewed: string
}

/**
 * The Enterprise Registry — the single source of truth for every business
 * MasterOps manages, current and future (D-006). Configuration-driven, no
 * database. Add a future business by adding one entry here; every
 * Enterprise page (Portfolio, Operations, and any future page) reads from
 * this same list — nothing else should hold its own copy of this data.
 *
 * MasterOps Status is deliberately NOT a field here. Per D-004A, it is
 * always derived live from `projects` table connectivity (see
 * portfolio-workspace.ts), never hand-maintained, so it can never drift
 * out of sync with what MasterOps actually observes.
 *
 * Every field below except slug/businessName/businessStage/dateAdded/
 * lastReviewed is left `null` until the Founder supplies a real value —
 * no owner, contact, URL, repository, or category is invented. dateAdded
 * and lastReviewed are set to the date this registry was created; edit
 * lastReviewed whenever a profile is next reviewed.
 */
export const ENTERPRISE_REGISTRY: EnterpriseProfile[] = [
  {
    slug: 'elbold',
    businessName: 'ELBOLD',
    shortDescription: 'Event marketplace, Vendor OS, and Customer Event OS.',
    businessStage: 'Unspecified',
    businessOwner: null,
    primaryWebsite: 'https://www.elbold.com',
    productionUrl: 'https://www.elbold.com',
    developmentUrl: null,
    gitRepository: 'abs365/bold-party-planner',
    documentationLocation: null,
    primaryContact: null,
    supportContact: null,
    businessCategory: null,
    dateAdded: '2026-07-08',
    lastReviewed: '2026-07-08',
  },
  {
    slug: 'master-growth-os',
    businessName: 'Master Growth OS',
    shortDescription: null,
    businessStage: 'Unspecified',
    businessOwner: null,
    primaryWebsite: null,
    productionUrl: null,
    developmentUrl: null,
    gitRepository: null,
    documentationLocation: null,
    primaryContact: null,
    supportContact: null,
    businessCategory: null,
    dateAdded: '2026-07-08',
    lastReviewed: '2026-07-08',
  },
  {
    slug: 'football-intelligence-group',
    businessName: 'Football Intelligence Group',
    shortDescription: null,
    businessStage: 'Unspecified',
    businessOwner: null,
    primaryWebsite: null,
    productionUrl: null,
    developmentUrl: null,
    gitRepository: null,
    documentationLocation: null,
    primaryContact: null,
    supportContact: null,
    businessCategory: null,
    dateAdded: '2026-07-08',
    lastReviewed: '2026-07-08',
  },
  {
    slug: 'churchos',
    businessName: 'ChurchOS',
    shortDescription: null,
    businessStage: 'Unspecified',
    businessOwner: null,
    primaryWebsite: null,
    productionUrl: null,
    developmentUrl: null,
    gitRepository: null,
    documentationLocation: null,
    primaryContact: null,
    supportContact: null,
    businessCategory: null,
    dateAdded: '2026-07-08',
    lastReviewed: '2026-07-08',
  },
  {
    slug: 'familyos',
    businessName: 'FamilyOS',
    shortDescription: null,
    businessStage: 'Unspecified',
    businessOwner: null,
    primaryWebsite: null,
    productionUrl: null,
    developmentUrl: null,
    gitRepository: null,
    documentationLocation: null,
    primaryContact: null,
    supportContact: null,
    businessCategory: null,
    dateAdded: '2026-07-08',
    lastReviewed: '2026-07-08',
  },
  {
    slug: 'meritbold',
    businessName: 'MeritBold',
    shortDescription: null,
    businessStage: 'Unspecified',
    businessOwner: null,
    primaryWebsite: null,
    productionUrl: null,
    developmentUrl: null,
    gitRepository: null,
    documentationLocation: null,
    primaryContact: null,
    supportContact: null,
    businessCategory: null,
    dateAdded: '2026-07-08',
    lastReviewed: '2026-07-08',
  },
  {
    slug: 'angel-digital',
    businessName: 'Angel Digital',
    shortDescription: null,
    businessStage: 'Unspecified',
    businessOwner: null,
    primaryWebsite: null,
    productionUrl: null,
    developmentUrl: null,
    gitRepository: null,
    documentationLocation: null,
    primaryContact: null,
    supportContact: null,
    businessCategory: null,
    dateAdded: '2026-07-15',
    lastReviewed: '2026-07-15',
  },
]

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function getEnterpriseProfile(slug: string): EnterpriseProfile | undefined {
  return ENTERPRISE_REGISTRY.find(p => p.slug === slug)
}

export function getEnterpriseProfileByName(name: string): EnterpriseProfile | undefined {
  const target = normalize(name)
  return ENTERPRISE_REGISTRY.find(p => normalize(p.businessName) === target)
}
