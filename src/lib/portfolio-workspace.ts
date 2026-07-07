import { createClient } from '@/lib/supabase/server'
import { Project } from '@/types'
import { ENTERPRISE_ROSTER } from '@/lib/enterprise-roster'
import { BusinessStage, businessStageFor } from '@/lib/enterprise-stage-config'

export type MasterOpsStatus = 'Connected' | 'Partially Connected' | 'Not Connected'

/** Operational read for the Portfolio Summary tiles only -- derived from
 * MasterOps connection + health, same as before. Distinct from Business
 * Stage, which is never derived from connectivity (see
 * enterprise-stage-config.ts). */
export type OperationalBucket = 'Active' | 'Attention' | 'Planning'

export interface EnterpriseCardData {
  name: string
  project: Project | null
  businessStage: BusinessStage
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

function buildCard(name: string, project: Project | null): EnterpriseCardData {
  return {
    name,
    project,
    businessStage: businessStageFor(name),
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

  const rosterCards: EnterpriseCardData[] = ENTERPRISE_ROSTER.map(name => {
    const project = projects.find(p => normalize(p.name) === normalize(name)) ?? null
    if (project) matched.add(project.id)
    return buildCard(name, project)
  })

  const extraCards: EnterpriseCardData[] = projects
    .filter(p => !matched.has(p.id))
    .map(project => buildCard(project.name, project))

  const cards = [...rosterCards, ...extraCards]

  const summary: PortfolioSummaryData = {
    total: cards.length,
    active: cards.filter(c => c.operationalBucket === 'Active').length,
    planning: cards.filter(c => c.operationalBucket === 'Planning').length,
    attention: cards.filter(c => c.operationalBucket === 'Attention').length,
  }

  return { cards, summary }
}
