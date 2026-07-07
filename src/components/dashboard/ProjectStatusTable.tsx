import { createClient } from '@/lib/supabase/server'
import { Project } from '@/types'
import { formatMs, timeAgo } from '@/lib/utils'
import { Card, CardHeader } from '@/components/ui/Card'
import { Table, TableHead, TableHeaderCell, TableBody, TableRow, TableCell } from '@/components/ui/Table'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { FolderKanban } from 'lucide-react'

export async function ProjectStatusTable() {
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
      <CardHeader title="Portfolio Status" />
      {projects.length === 0 ? (
        <EmptyState icon={FolderKanban} message="No projects yet — run the Supabase migration to seed your portfolio." />
      ) : (
        <Table>
          <TableHead>
            <TableHeaderCell>Project</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Response</TableHeaderCell>
            <TableHeaderCell>Checked</TableHeaderCell>
          </TableHead>
          <TableBody>
            {projects.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-medium text-gray-800">{p.name}</TableCell>
                <TableCell><StatusBadge status={p.status} /></TableCell>
                <TableCell>{formatMs(p.response_time_ms)}</TableCell>
                <TableCell className="text-gray-400">{timeAgo(p.last_checked_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  )
}
