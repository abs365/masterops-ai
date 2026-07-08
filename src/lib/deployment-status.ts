import { createClient } from '@/lib/supabase/server'

export interface VercelDeploymentEntry {
  project_name: string
  project_slug: string
  vercel_project_id: string | null
  deployment: {
    uid: string
    state: string
    url: string
    created_at: string
  } | null
}

export interface VercelData {
  configured: boolean
  message?: string
  deployments: VercelDeploymentEntry[]
}

export interface GitHubWorkflowRun {
  name: string
  status: string
  conclusion: string | null
  created_at: string
}

export interface GitHubProjectEntry {
  project_name: string
  project_slug: string
  repo: string | null
  default_branch: string | null
  updated_at: string | null
  workflow: GitHubWorkflowRun | null
}

export interface GitHubData {
  configured: boolean
  message?: string
  projects: GitHubProjectEntry[]
}

export async function getVercelData(): Promise<VercelData> {
  const token = process.env.VERCEL_TOKEN
  const teamId = process.env.VERCEL_TEAM_ID

  if (!token) return { configured: false, message: 'Set VERCEL_TOKEN in .env.local.', deployments: [] }

  try {
    const supabase = await createClient()
    const { data: projects } = await supabase
      .from('projects').select('id, name, slug, vercel_project_id').not('vercel_project_id', 'is', null)

    if (!projects?.length) {
      return { configured: true, message: 'No projects have vercel_project_id set.', deployments: [] }
    }

    const deployments = await Promise.all(projects.map(async (p) => {
      try {
        const params = new URLSearchParams({ projectId: p.vercel_project_id!, limit: '1' })
        if (teamId) params.set('teamId', teamId)
        const res = await fetch(`https://api.vercel.com/v6/deployments?${params}`, {
          headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000),
        })
        if (!res.ok) throw new Error()
        const d = (await res.json()).deployments?.[0] ?? null
        return {
          project_name: p.name, project_slug: p.slug, vercel_project_id: p.vercel_project_id,
          deployment: d ? { uid: d.uid, state: d.readyState ?? d.state, url: `https://${d.url}`, created_at: new Date(d.createdAt).toISOString() } : null,
        }
      } catch {
        return { project_name: p.name, project_slug: p.slug, vercel_project_id: p.vercel_project_id, deployment: null }
      }
    }))

    return { configured: true, deployments }
  } catch {
    return { configured: false, message: 'Failed to load Vercel data.', deployments: [] }
  }
}

export async function getGitHubData(): Promise<GitHubData> {
  const token = process.env.GITHUB_TOKEN
  if (!token) return { configured: false, message: 'Set GITHUB_TOKEN in .env.local.', projects: [] }

  try {
    const supabase = await createClient()
    const { data: projects } = await supabase
      .from('projects').select('id, name, slug, github_repo').not('github_repo', 'is', null)

    if (!projects?.length) {
      return { configured: true, message: 'No projects have github_repo set.', projects: [] }
    }

    const results = await Promise.all(projects.map(async (p) => {
      try {
        const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }
        const [repoRes, runsRes] = await Promise.all([
          fetch(`https://api.github.com/repos/${p.github_repo}`, { headers, signal: AbortSignal.timeout(8000) }),
          fetch(`https://api.github.com/repos/${p.github_repo}/actions/runs?per_page=1`, { headers, signal: AbortSignal.timeout(8000) }),
        ])
        const repo = repoRes.ok ? await repoRes.json() : null
        const runs = runsRes.ok ? await runsRes.json() : null
        const run = runs?.workflow_runs?.[0] ?? null
        return {
          project_name: p.name, project_slug: p.slug, repo: p.github_repo,
          default_branch: repo?.default_branch ?? null, updated_at: repo?.pushed_at ?? null,
          workflow: run ? { name: run.name, status: run.status, conclusion: run.conclusion, created_at: run.created_at } : null,
        }
      } catch {
        return { project_name: p.name, project_slug: p.slug, repo: p.github_repo, default_branch: null, updated_at: null, workflow: null }
      }
    }))

    return { configured: true, projects: results }
  } catch {
    return { configured: false, message: 'Failed to load GitHub data.', projects: [] }
  }
}
