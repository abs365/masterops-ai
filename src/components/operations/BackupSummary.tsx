import Link from 'next/link'
import { HardDrive } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { getBackupData } from '@/lib/backup-status'

export async function BackupSummary() {
  const { configured, projects } = await getBackupData()
  const linked = projects.filter(p => p.supabase_project_id).length
  const action = (
    <Link href="/backups" className="text-xs text-indigo-600 hover:underline whitespace-nowrap">
      Full Continuity →
    </Link>
  )

  return (
    <Card padded={false}>
      <CardHeader title="Backup Summary" action={action} />
      {projects.length === 0 ? (
        <EmptyState icon={HardDrive} message="No projects registered yet." />
      ) : (
        <div className="px-5 py-4 space-y-2">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">{linked}</span> of <span className="font-semibold">{projects.length}</span> projects linked to a Supabase project ID
          </p>
          <p className="text-xs text-gray-400">
            {configured
              ? 'Automated backup verification is configured (SUPABASE_ACCESS_TOKEN + SUPABASE_ORG_ID present).'
              : 'Automated backup verification is not configured — backups must be checked manually in each Supabase dashboard.'}
          </p>
        </div>
      )}
    </Card>
  )
}
