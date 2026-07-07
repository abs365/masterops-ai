import { createClient } from '@/lib/supabase/server'
import { Project } from '@/types'
import { ENTERPRISE_ROSTER } from '@/lib/enterprise-roster'

export type EnterpriseStage = 'Active' | 'Attention' | 'Planning'

export interface EnterpriseCardData {
  name: string
  connected: boolean
  stage: EnterpriseStage
  project: Project | null
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

function stageFor(project: Project | null): EnterpriseStage {
  if (!project) return 'Planning'
  if (project.status === 'down' || project.status === 'slow' || project.status === 'warning') return 'Attention'
  return 'Active'
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
    return { name, connected: !!project, stage: stageFor(project), project }
  })

  const extraCards: EnterpriseCardData[] = projects
    .filter(p => !matched.has(p.id))
    .map(project => ({ name: project.name, connected: true, stage: stageFor(project), project }))

  const cards = [...rosterCards, ...extraCards]

  const summary: PortfolioSummaryData = {
    total: cards.length,
    active: cards.filter(c => c.stage === 'Active').length,
    planning: cards.filter(c => c.stage === 'Planning').length,
    attention: cards.filter(c => c.stage === 'Attention').length,
  }

  return { cards, summary }
}
