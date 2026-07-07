import { createClient } from '@/lib/supabase/server'
import { Project } from '@/types'
import { formatMs, timeAgo } from '@/lib/utils'
import { Card, CardHeader } from '@/components/ui/Card'
import { Table, TableHead, TableHeaderCell, TableBody, TableRow, TableCell } from '@/components/ui/Table'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { FolderKanban, ExternalLink } from 'lucide-react'

export async function PortfolioHealth() {
  let projects: Project[] = []
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('projects')
      .select('*')
      .order('name')
    projects = (data as Project[]) ?? []
  } catch { /* supabase not configured */ }

  return (
    <Card padded={false}>
      <CardHeader title="Portfolio Health" />
      {projects.length === 0 ? (
        <EmptyState icon={FolderKanban} message="No projects yet — run the Supabase migration to seed your portfolio." />
      ) : (
        <Table>
          <TableHead>
            <TableHeaderCell>Business</TableHeaderCell>
            <TableHeaderCell>Health</TableHeaderCell>
            <TableHeaderCell>Response</TableHeaderCell>
            <TableHeaderCell>Last Activity</TableHeaderCell>
            <TableHeaderCell>Quick Access</TableHeaderCell>
          </TableHead>
          <TableBody>
            {projects.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-medium text-gray-800">{p.name}</TableCell>
                <TableCell><StatusBadge status={p.status} /></TableCell>
                <TableCell>{formatMs(p.response_time_ms)}</TableCell>
                <TableCell className="text-gray-400">{timeAgo(p.last_checked_at)}</TableCell>
                <TableCell>
                  {p.url ? (
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      Open <ExternalLink size={12} />
                    </a>
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  )
}
