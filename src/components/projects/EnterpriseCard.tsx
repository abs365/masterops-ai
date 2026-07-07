import { ExternalLink, Circle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatMs, timeAgo } from '@/lib/utils'
import { EnterpriseCardData } from '@/lib/portfolio-workspace'

const stageStyle: Record<EnterpriseCardData['stage'], string> = {
  Active: 'text-green-700 bg-green-50 border-green-200',
  Attention: 'text-red-700 bg-red-50 border-red-200',
  Planning: 'text-gray-500 bg-gray-50 border-gray-200',
}

export function EnterpriseCard({ card }: { card: EnterpriseCardData }) {
  const { name, connected, stage, project } = card

  return (
    <Card className="flex flex-col h-full">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-gray-900 truncate" title={name}>{name}</h3>
          <span className={`inline-flex mt-1.5 text-xs px-2 py-0.5 rounded-full border font-medium ${stageStyle[stage]}`}>
            {stage}
          </span>
        </div>
        {connected && project ? (
          <span className="shrink-0"><StatusBadge status={project.status} /></span>
        ) : (
          <span className="shrink-0 whitespace-nowrap inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium text-gray-400 bg-gray-50 border-gray-200">
            <Circle size={6} className="fill-current" /> Not Connected
          </span>
        )}
      </div>

      <div className="mt-4 space-y-1.5 text-xs text-gray-500">
        <p>
          <span className="text-gray-400">Last activity:</span>{' '}
          {connected && project ? timeAgo(project.last_checked_at) : '—'}
        </p>
        {connected && project?.response_time_ms != null && (
          <p><span className="text-gray-400">Response:</span> {formatMs(project.response_time_ms)}</p>
        )}
        {!connected && (
          <p className="text-gray-400 italic">Not yet connected to MasterOps — no live data available.</p>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 flex-1 flex items-end">
        {connected && project?.url ? (
          <a
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            Open Workspace <ExternalLink size={14} />
          </a>
        ) : (
          <button
            disabled
            className="w-full px-3 py-2 rounded-lg text-sm font-medium bg-gray-50 text-gray-400 border border-gray-200 cursor-not-allowed"
            title="No workspace URL is connected for this business yet"
          >
            Not Yet Linked
          </button>
        )}
      </div>
    </Card>
  )
}
