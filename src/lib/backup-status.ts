import { createClient } from '@/lib/supabase/server'

export interface BackupProjectEntry {
  name: string
  slug: string
  supabase_project_id: string | null
}

export interface BackupData {
  configured: boolean
  projects: BackupProjectEntry[]
}

export async function getBackupData(): Promise<BackupData> {
  const configured = !!(process.env.SUPABASE_ACCESS_TOKEN && process.env.SUPABASE_ORG_ID)

  let projects: BackupProjectEntry[] = []
  try {
    const supabase = await createClient()
    const { data } = await supabase.from('projects').select('name, slug, supabase_project_id').order('name')
    projects = data ?? []
  } catch { /* not connected */ }

  return { configured, projects }
}
