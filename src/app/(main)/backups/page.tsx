import { BackupsPanel } from '@/components/backups/BackupsPanel'

export const dynamic = 'force-dynamic'

export default function BackupsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Backups</h2>
        <p className="text-sm text-gray-500 mt-0.5">Database backup status across all connected Supabase projects</p>
      </div>
      <BackupsPanel />
    </div>
  )
}
