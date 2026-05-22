import { DailyReport } from '@/types'

interface Props {
  report: DailyReport
  isLatest?: boolean
}

export function ReportCard({ report, isLatest }: Props) {
  const date = new Date(report.report_date).toLocaleDateString('en-GB', { dateStyle: 'long' })

  return (
    <div className={`bg-white rounded-xl border p-6 space-y-4 ${isLatest ? 'border-indigo-200 shadow-sm' : 'border-gray-200'}`}>
      <div className="flex items-center gap-2">
        <span className={`text-xs px-2 py-1 rounded-full border font-medium ${isLatest ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
          {date}
        </span>
        {isLatest && <span className="text-xs text-indigo-400">Latest</span>}
      </div>

      <section>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Executive Summary</h4>
        <p className="text-sm text-gray-700 leading-relaxed">{report.summary}</p>
      </section>

      {report.risks && (
        <section>
          <h4 className="text-xs font-semibold text-yellow-600 uppercase tracking-wide mb-1.5">Risks</h4>
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{report.risks}</pre>
        </section>
      )}

      {report.recommendations && (
        <section>
          <h4 className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1.5">Recommended Actions</h4>
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{report.recommendations}</pre>
        </section>
      )}
    </div>
  )
}
