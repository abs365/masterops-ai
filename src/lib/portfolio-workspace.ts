import { createClient } from '@/lib/supabase/server'
import { Project } from '@/types'
import { ENTERPRISE_REGISTRY, EnterpriseProfile } from '@/lib/enterprise-registry'

export type MasterOpsStatus = 'Connected' | 'Partially Connected' | 'Not Connected'

/** Operational read for the Portfolio Summary tiles only -- derived from
 * MasterOps connection + health, same as before. Distinct from Business
 * Stage, which is never derived from connectivity (see
 * enterprise-registry.ts). */
export type OperationalBucket = 'Active' | 'Attention' | 'Planning'

export interface EnterpriseCardData {
  profile: EnterpriseProfile
  project: Project | null
  masterOpsStatus: MasterOpsStatus
  operationalBucket: OperationalBucket
}

export interface PortfolioSummaryData {
  total: number
  active: number
  planning: number
  attention: number
}

export interface PortfolioWorkspaceData {
  cards: EnterpriseCardData[]
  summary: PortfolioSummaryData
}

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function masterOpsStatusFor(project: Project | null): MasterOpsStatus {
  if (!project) return 'Not Connected'
  const hasBeenChecked = project.last_checked_at !== null
  const hasUrl = !!project.url
  return hasBeenChecked && hasUrl ? 'Connected' : 'Partially Connected'
}

function operationalBucketFor(project: Project | null): OperationalBucket {
  if (!project) return 'Planning'
  if (project.status === 'down' || project.status === 'slow' || project.status === 'warning') return 'Attention'
  return 'Active'
}

/** Minimal, clearly-labelled profile for a live `projects` row that has no
 * matching Enterprise Registry entry yet -- preserves D-004's original
 * behaviour of still showing the card, without inventing registry data
 * for a business the Founder hasn't added to the registry. */
function unregisteredProfile(name: string): EnterpriseProfile {
  return {
    slug: normalize(name),
    businessName: name,
    shortDescription: 'Not yet added to the Enterprise Registry.',
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
    dateAdded: '',
    lastReviewed: '',
  }
}

function buildCard(profile: EnterpriseProfile, project: Project | null): EnterpriseCardData {
  return {
    profile,
    project,
    masterOpsStatus: masterOpsStatusFor(project),
    operationalBucket: operationalBucketFor(project),
  }
}

async function getRegisteredProjects(): Promise<Project[]> {
  try {
    const supabase = await createClient()
    const { data } = await supabase.from('projects').select('*').order('name')
    return (data as Project[]) ?? []
  } catch {
    return []
  }
}

export async function getPortfolioWorkspace(): Promise<PortfolioWorkspaceData> {
  const projects = await getRegisteredProjects()
  const matched = new Set<string>()

  const registryCards: EnterpriseCardData[] = ENTERPRISE_REGISTRY.map(profile => {
    const project = projects.find(p => normalize(p.name) === normalize(profile.businessName)) ?? null
    if (project) matched.add(project.id)
    return buildCard(profile, project)
  })

  const extraCards: EnterpriseCardData[] = projects
    .filter(p => !matched.has(p.id))
    .map(project => buildCard(unregisteredProfile(project.name), project))

  const cards = [...registryCards, ...extraCards]

  const summary: PortfolioSummaryData = {
    total: cards.length,
    active: cards.filter(c => c.operationalBucket === 'Active').length,
    planning: cards.filter(c => c.operationalBucket === 'Planning').length,
    attention: cards.filter(c => c.operationalBucket === 'Attention').length,
  }

  return { cards, summary }
}
