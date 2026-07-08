import { ExternalLink } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { formatMs, timeAgo } from '@/lib/utils'
import { EnterpriseCardData, MasterOpsStatus } from '@/lib/portfolio-workspace'

const masterOpsStatusStyle: Record<MasterOpsStatus, string> = {
  'Connected': 'text-green-700 bg-green-50 border-green-200',
  'Partially Connected': 'text-yellow-700 bg-yellow-50 border-yellow-200',
  'Not Connected': 'text-gray-500 bg-gray-50 border-gray-200',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      {children}
    </div>
  )
}

export function EnterpriseCard({ card }: { card: EnterpriseCardData }) {
  const { profile, project, masterOpsStatus } = card
  const { businessName, businessStage, shortDescription } = profile
  const isStageSet = businessStage !== 'Unspecified'
  const workspaceUrl = project?.url ?? profile.productionUrl

  return (
    <Card className="flex flex-col h-full">
      <h3 className="text-base font-semibold text-gray-900 truncate" title={businessName}>{businessName}</h3>
      {shortDescription && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{shortDescription}</p>}

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Field label="Business Stage">
          {isStageSet ? (
            <span className="inline-flex mt-1 text-xs px-2 py-0.5 rounded-full border font-medium text-indigo-700 bg-indigo-50 border-indigo-200">
              {businessStage}
            </span>
          ) : (
            <span className="inline-flex mt-1 text-xs text-gray-400 italic">Not set</span>
          )}
        </Field>
        <Field label="MasterOps Status">
          <span className={`inline-flex mt-1 whitespace-nowrap text-xs px-2 py-0.5 rounded-full border font-medium ${masterOpsStatusStyle[masterOpsStatus]}`}>
            {masterOpsStatus}
          </span>
        </Field>
      </div>

      <div className="mt-4 space-y-1.5 text-xs text-gray-500">
        <p>
          <span className="text-gray-400">Last activity:</span>{' '}
          {project ? timeAgo(project.last_checked_at) : '—'}
        </p>
        {project?.response_time_ms != null && (
          <p><span className="text-gray-400">Response:</span> {formatMs(project.response_time_ms)}</p>
        )}
        {!project && (
          <p className="text-gray-400 italic">Not yet connected to MasterOps — no live data available.</p>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 flex-1 flex items-end">
        {workspaceUrl ? (
          <a
            href={workspaceUrl}
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
