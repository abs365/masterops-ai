import { CheckCircle, XCircle, ExternalLink } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface EnvVar {
  key: string
  label: string
  description: string
  required: boolean
  group: string
}

const ENV_VARS: EnvVar[] = [
  // Core
  { key: 'NEXT_PUBLIC_SUPABASE_URL',      label: 'Supabase URL',          description: 'Database connection URL',               required: true,  group: 'Core' },
  { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', label: 'Supabase Anon Key',     description: 'Public key for dashboard queries',      required: true,  group: 'Core' },
  { key: 'SUPABASE_SERVICE_ROLE_KEY',     label: 'Supabase Service Key',  description: 'Server-only key for write operations',  required: true,  group: 'Core' },
  { key: 'ADMIN_EMAILS',                  label: 'Admin Emails',          description: 'Who can access this dashboard',         required: true,  group: 'Core' },
  // Notifications
  { key: 'TELEGRAM_BOT_TOKEN',            label: 'Telegram Bot Token',    description: 'For Telegram alert notifications',      required: false, group: 'Notifications' },
  { key: 'TELEGRAM_CHAT_ID',              label: 'Telegram Chat ID',      description: 'Destination chat for alerts',           required: false, group: 'Notifications' },
  { key: 'RESEND_API_KEY',                label: 'Resend API Key',         description: 'For email alert backup',                required: false, group: 'Notifications' },
  { key: 'ALERT_EMAIL_TO',               label: 'Alert Email To',         description: 'Recipient for email alerts',            required: false, group: 'Notifications' },
  { key: 'ALERT_EMAIL_FROM',             label: 'Alert Email From',       description: 'Sender address for email alerts',       required: false, group: 'Notifications' },
  // Integrations
  { key: 'GITHUB_TOKEN',                  label: 'GitHub Token',          description: 'Read repo + CI status (scope: repo)',   required: false, group: 'Integrations' },
  { key: 'VERCEL_TOKEN',                  label: 'Vercel Token',          description: 'Fetch deployment status',               required: false, group: 'Integrations' },
  { key: 'VERCEL_TEAM_ID',               label: 'Vercel Team ID',         description: 'Required for team Vercel accounts',     required: false, group: 'Integrations' },
  { key: 'SUPABASE_ACCESS_TOKEN',         label: 'Supabase Access Token', description: 'Management API for backup checks',      required: false, group: 'Integrations' },
  { key: 'SUPABASE_ORG_ID',              label: 'Supabase Org ID',        description: 'Required with access token',            required: false, group: 'Integrations' },
  // Security
  { key: 'CRON_SECRET',                   label: 'Cron Secret',           description: 'Protects health check endpoint',        required: false, group: 'Security' },
  { key: 'SECURITY_INGEST_SECRET',        label: 'Security Ingest Secret',description: 'Protects /api/security/log-event',      required: false, group: 'Security' },
  { key: 'USAGE_INGEST_SECRET',           label: 'Usage Ingest Secret',   description: 'Protects /api/costs/log-usage',         required: false, group: 'Security' },
  { key: 'DAILY_COST_LIMIT_GBP',         label: 'Daily Cost Limit',       description: 'Emergency alert threshold in $',        required: false, group: 'Security' },
  // AI
  { key: 'OPENAI_API_KEY',               label: 'OpenAI API Key',         description: 'AI-powered daily reports',              required: false, group: 'AI' },
  { key: 'ANTHROPIC_API_KEY',            label: 'Anthropic API Key',      description: 'Fallback AI for daily reports',         required: false, group: 'AI' },
]

function getConfigured(key: string): boolean {
  return !!(process.env[key])
}

const MANUAL_TESTS = [
  { label: 'Run project health check',  href: '/api/monitor/check-projects', method: 'POST', desc: 'Checks all project URLs and updates status' },
  { label: 'Generate daily report',     href: '/api/reports/daily',           method: 'POST', desc: 'Creates or overwrites today\'s report' },
  { label: 'Check API usage cost',      href: '/api/costs/check-usage',       method: 'GET',  desc: 'Calculates today\'s estimated API spend' },
  { label: 'Check deployment status',   href: '/api/deployments/status',      method: 'GET',  desc: 'Fetches latest Vercel deployment per project' },
  { label: 'Check GitHub status',       href: '/api/deployments/github-status', method: 'GET', desc: 'Fetches latest CI run per GitHub repo' },
  { label: 'Check backup status',       href: '/api/backups/status',          method: 'GET',  desc: 'Returns backup configuration per project' },
]

const groups = [...new Set(ENV_VARS.map(v => v.group))]

export default function SettingsPage() {
  const configured = ENV_VARS.map(v => ({ ...v, isConfigured: getConfigured(v.key) }))
  const requiredMissing = configured.filter(v => v.required && !v.isConfigured)
  const optionalConfigured = configured.filter(v => !v.required && v.isConfigured)

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-500 mt-0.5">Environment health, integrations, and system configuration</p>
      </div>

      {/* Health summary */}
      {requiredMissing.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <strong>{requiredMissing.length} required variable{requiredMissing.length !== 1 ? 's' : ''} missing:</strong>{' '}
          {requiredMissing.map(v => v.label).join(', ')}.
          {' '}Add them to <code className="font-mono text-xs bg-red-100 px-1 rounded">.env.local</code>.
        </div>
      )}
      {requiredMissing.length === 0 && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          All required environment variables are configured. {optionalConfigured.length} optional integration{optionalConfigured.length !== 1 ? 's' : ''} also active.
        </div>
      )}

      {/* Env vars by group */}
      {groups.map(group => {
        const vars = configured.filter(v => v.group === group)
        return (
          <section key={group} className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700">{group}</h3>
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {vars.map(v => (
                <div key={v.key} className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{v.label}</p>
                      {v.required && (
                        <span className="text-xs px-1.5 py-0.5 rounded border text-red-500 bg-red-50 border-red-200">required</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{v.description}</p>
                  </div>
                  <div className="flex items-center gap-1.5 ml-4">
                    {v.isConfigured ? (
                      <>
                        <CheckCircle size={14} className="text-green-500" />
                        <span className="text-xs text-green-600 font-medium">Configured</span>
                      </>
                    ) : (
                      <>
                        <XCircle size={14} className="text-gray-300" />
                        <span className="text-xs text-gray-400">Missing</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )
      })}

      {/* Manual test links */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-700">Manual Test Endpoints</h3>
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {MANUAL_TESTS.map(t => (
            <div key={t.href} className="flex items-center justify-between px-5 py-3.5">
              <div>
                <p className="text-sm font-medium text-gray-900">{t.label}</p>
                <p className="text-xs text-gray-400">{t.desc}</p>
              </div>
              <a
                href={t.method === 'GET' ? t.href : undefined}
                onClick={t.method === 'POST' ? async (e) => {
                  e.preventDefault()
                  await fetch(t.href, { method: 'POST' })
                  window.location.reload()
                } : undefined}
                className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 px-3 py-1.5 rounded-lg border border-indigo-200 hover:bg-indigo-50 transition-colors"
                target={t.method === 'GET' ? '_blank' : undefined}
                rel="noreferrer"
              >
                <ExternalLink size={11} />
                {t.method} {t.href.split('/').slice(-1)[0]}
              </a>
            </div>
          ))}
        </div>
      </section>

      <p className="text-xs text-gray-400">
        Secret values are never displayed. Set all variables in <code className="bg-gray-100 px-1 rounded">.env.local</code> (local) or Vercel Environment Variables (production).
      </p>
    </div>
  )
}
