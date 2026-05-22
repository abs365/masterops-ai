import { GenerateReportButton } from '@/components/reports/GenerateReportButton'
import { ReportCard } from '@/components/reports/ReportCard'
import { createClient } from '@/lib/supabase/server'
import { DailyReport } from '@/types'

export const dynamic = 'force-dynamic'

async function getReports(): Promise<DailyReport[]> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('daily_reports')
      .select('*')
      .order('report_date', { ascending: false })
      .limit(14)
    return (data as DailyReport[]) ?? []
  } catch {
    return []
  }
}

const MOCK_REPORT: DailyReport = {
  id: 'mock',
  report_date: new Date().toISOString().split('T')[0],
  summary: 'No reports generated yet. Click "Generate Report Now" to create your first daily operational summary.',
  risks: '• Supabase not connected — add credentials to .env.local\n• No health check URLs configured for projects\n• No AI API key — reports will use template format',
  recommendations: '1. Add Supabase credentials to .env.local\n2. Run migration 001, 002, 003 in Supabase SQL Editor\n3. Add project health URLs in Supabase projects table\n4. Add OPENAI_API_KEY or ANTHROPIC_API_KEY for AI-powered reports\n5. Click "Generate Report Now" above',
  created_at: new Date().toISOString(),
}

export default async function ReportsPage() {
  const reports = await getReports()
  const displayReports = reports.length > 0 ? reports : [MOCK_REPORT]
  const hasAI = !!(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Daily Reports</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {hasAI ? 'AI-powered' : 'Template-based'} operational summaries · {reports.length} report{reports.length !== 1 ? 's' : ''} stored
          </p>
        </div>
        <GenerateReportButton />
      </div>

      {!hasAI && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Add <code className="font-mono text-xs bg-blue-100 px-1 rounded">OPENAI_API_KEY</code> or <code className="font-mono text-xs bg-blue-100 px-1 rounded">ANTHROPIC_API_KEY</code> to unlock AI-written business summaries. Template reports are used until then.
        </div>
      )}

      <div className="space-y-4">
        {displayReports.map((report, i) => (
          <ReportCard key={report.id} report={report} isLatest={i === 0 && reports.length > 0} />
        ))}
      </div>
    </div>
  )
}
