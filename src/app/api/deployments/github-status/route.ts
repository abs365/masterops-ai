import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface GitHubWorkflowRun {
  id: number
  status: string
  conclusion: string | null
  created_at: string
  name: string
}

async function fetchGitHubRepo(repo: string, token: string) {
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }

  const [repoRes, runsRes] = await Promise.all([
    fetch(`https://api.github.com/repos/${repo}`, { headers, signal: AbortSignal.timeout(8000) }),
    fetch(`https://api.github.com/repos/${repo}/actions/runs?per_page=1`, { headers, signal: AbortSignal.timeout(8000) }),
  ])

  const repoData = repoRes.ok ? await repoRes.json() : null
  const runsData = runsRes.ok ? await runsRes.json() : null
  const latestRun: GitHubWorkflowRun | null = runsData?.workflow_runs?.[0] ?? null

  return {
    repo,
    default_branch: repoData?.default_branch ?? null,
    latest_commit: repoData?.pushed_at ?? null,
    updated_at: repoData?.updated_at ?? null,
    workflow: latestRun
      ? {
          name: latestRun.name,
          status: latestRun.status,
          conclusion: latestRun.conclusion,
          created_at: latestRun.created_at,
        }
      : null,
  }
}

export async function GET() {
  const token = process.env.GITHUB_TOKEN

  if (!token) {
    return NextResponse.json({
      configured: false,
      message: 'Set GITHUB_TOKEN in .env.local to enable GitHub monitoring. Required scope: repo (read).',
      projects: [],
    })
  }

  try {
    const supabase = await createClient()
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name, slug, github_repo')
      .not('github_repo', 'is', null)

    if (!projects || projects.length === 0) {
      return NextResponse.json({
        configured: true,
        message: 'No projects have github_repo set. Update the projects table in Supabase.',
        projects: [],
      })
    }

    const results = await Promise.all(
      projects.map(async (project) => {
        try {
          const github = await fetchGitHubRepo(project.github_repo!, token)
          return { project_name: project.name, project_slug: project.slug, ...github }
        } catch {
          return {
            project_name: project.name,
            project_slug: project.slug,
            repo: project.github_repo,
            default_branch: null,
            latest_commit: null,
            updated_at: null,
            workflow: null,
          }
        }
      })
    )

    return NextResponse.json({ configured: true, projects: results })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
