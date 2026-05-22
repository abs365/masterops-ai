import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN
  const orgId = process.env.SUPABASE_ORG_ID

  // Fetch projects that have supabase_project_id set
  let projects: Array<{ name: string; slug: string; supabase_project_id: string | null }> = []
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('projects')
      .select('name, slug, supabase_project_id')
      .order('name')
    projects = data ?? []
  } catch { /* supabase not configured */ }

  if (!accessToken || !orgId) {
    return NextResponse.json({
      configured: false,
      message: 'Set SUPABASE_ACCESS_TOKEN and SUPABASE_ORG_ID to enable automated backup checks. In the meantime, verify backups manually in each Supabase project dashboard.',
      manual_check_url: 'https://supabase.com/dashboard',
      projects: projects.map(p => ({
        name: p.name,
        slug: p.slug,
        supabase_project_id: p.supabase_project_id,
        backup_status: p.supabase_project_id ? 'manual_check_required' : 'not_configured',
        last_backup: null,
      })),
    })
  }

  // If Supabase Management API credentials exist, query per project
  const results = await Promise.all(
    projects
      .filter(p => p.supabase_project_id)
      .map(async (p) => {
        try {
          const res = await fetch(
            `https://api.supabase.com/v1/projects/${p.supabase_project_id}/database/backups`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              signal: AbortSignal.timeout(10000),
            }
          )
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const data = await res.json()
          const latest = Array.isArray(data) ? data[0] : null
          return {
            name: p.name, slug: p.slug, supabase_project_id: p.supabase_project_id,
            backup_status: latest ? 'available' : 'no_backups_found',
            last_backup: latest?.inserted_at ?? null,
          }
        } catch {
          return {
            name: p.name, slug: p.slug, supabase_project_id: p.supabase_project_id,
            backup_status: 'fetch_error', last_backup: null,
          }
        }
      })
  )

  const noSbProjects = projects
    .filter(p => !p.supabase_project_id)
    .map(p => ({ name: p.name, slug: p.slug, supabase_project_id: null, backup_status: 'not_configured', last_backup: null }))

  return NextResponse.json({ configured: true, projects: [...results, ...noSbProjects] })
}
