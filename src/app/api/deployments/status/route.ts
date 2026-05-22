import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface VercelDeployment {
  uid: string
  state: string
  readyState: string
  createdAt: number
  url: string
  name: string
  meta?: Record<string, string>
}

async function fetchLatestDeployment(
  projectId: string,
  token: string,
  teamId?: string
): Promise<VercelDeployment | null> {
  const params = new URLSearchParams({ projectId, limit: '1' })
  if (teamId) params.set('teamId', teamId)

  const res = await fetch(`https://api.vercel.com/v6/deployments?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(8000),
  })

  if (!res.ok) return null
  const data = await res.json()
  return data.deployments?.[0] ?? null
}

export async function GET() {
  const token = process.env.VERCEL_TOKEN
  const teamId = process.env.VERCEL_TEAM_ID

  if (!token) {
    return NextResponse.json({
      configured: false,
      message: 'Set VERCEL_TOKEN in .env.local to enable deployment monitoring.',
      deployments: [],
    })
  }

  try {
    const supabase = await createClient()
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name, slug, vercel_project_id')
      .not('vercel_project_id', 'is', null)

    if (!projects || projects.length === 0) {
      return NextResponse.json({
        configured: true,
        message: 'No projects have vercel_project_id set. Add them in Supabase.',
        deployments: [],
      })
    }

    const deployments = await Promise.all(
      projects.map(async (project) => {
        try {
          const dep = await fetchLatestDeployment(project.vercel_project_id!, token, teamId)
          return {
            project_name: project.name,
            project_slug: project.slug,
            vercel_project_id: project.vercel_project_id,
            deployment: dep
              ? {
                  uid: dep.uid,
                  state: dep.readyState ?? dep.state,
                  url: `https://${dep.url}`,
                  created_at: new Date(dep.createdAt).toISOString(),
                }
              : null,
          }
        } catch {
          return {
            project_name: project.name,
            project_slug: project.slug,
            vercel_project_id: project.vercel_project_id,
            deployment: null,
          }
        }
      })
    )

    return NextResponse.json({ configured: true, deployments })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
