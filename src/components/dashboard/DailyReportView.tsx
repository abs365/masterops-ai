import { createClient } from '@/lib/supabase/server'
import { DailyReport } from '@/types'

const MOCK_REPORT = {
  summary: 'All 5 projects are being monitored. No critical issues detected today.',
  risks: '- No Supabase credentials connected yet\n- Health check URLs not configured\n- Cost monitoring inactive',
  recommendations: '1. Add Supabase credentials to .env.local\n2. Configure health check URLs for each project\n3. Connect GitHub and Vercel tokens\n4. Enable Telegram alerts',
}

export async function DailyReportView() {
  let report: DailyReport | null = null
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('daily_reports')
      .select('*')
      .order('report_date', { ascending: false })
      .limit(1)
      .single()
    report = data as DailyReport
  } catch { /* use mock */ }

  const r = report ?? MOCK_REPORT

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
      <div className="flex items-center gap-2">
        <span className="text-xs px-2 py-1 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-full font-medium">
          {report ? new Date(report.report_date).toLocaleDateString('en-GB', { dateStyle: 'long' }) : 'Template Report'}
        </span>
        {!report && (
          <span className="text-xs text-gray-400">Connect OpenAI/Claude API to generate real reports</span>
        )}
      </div>

      <section>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Summary</h4>
        <p className="text-sm text-gray-700">{r.summary}</p>
      </section>

      <section>
        <h4 className="text-xs font-semibold text-yellow-600 uppercase tracking-wide mb-1">Risks</h4>
        <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">{r.risks}</pre>
      </section>

      <section>
        <h4 className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Recommended Actions</h4>
        <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">{r.recommendations}</pre>
      </section>
    </div>
  )
}
