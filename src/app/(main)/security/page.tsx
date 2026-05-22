import { SecurityStats } from '@/components/security/SecurityStats'
import { SecurityEventsClient } from '@/components/security/SecurityEventsClient'
import { createClient } from '@/lib/supabase/server'
import { SecurityEvent } from '@/types'

async function getSecurityData() {
  try {
    const supabase = await createClient()
    const [eventsRes, projectsRes] = await Promise.all([
      supabase
        .from('security_events')
        .select('*, project:projects(name, slug)')
        .order('created_at', { ascending: false })
        .limit(200),
      supabase
        .from('projects')
        .select('id, name, slug')
        .order('name'),
    ])
    return {
      events: (eventsRes.data as SecurityEvent[]) ?? [],
      projects: projectsRes.data ?? [],
    }
  } catch {
    return { events: [], projects: [] }
  }
}

export default async function SecurityPage() {
  const { events, projects } = await getSecurityData()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Security Centre</h2>
        <p className="text-sm text-gray-500 mt-0.5">Monitor suspicious activity, threats, and security events across all projects</p>
      </div>

      <SecurityStats />

      <SecurityEventsClient events={events} projects={projects} />

      {/* Ingestion guide */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-indigo-900">How to connect a project to MasterOps Security</h3>
        <p className="text-sm text-indigo-700">
          Any project can send security events here by calling the ingestion API. Events are stored, alerts created automatically, and Telegram + email notifications sent for critical events.
        </p>
        <div className="bg-white rounded-lg border border-indigo-200 p-4 font-mono text-xs text-gray-700 overflow-x-auto">
          <pre>{`POST https://your-masterops-url.vercel.app/api/security/log-event
x-masterops-secret: YOUR_SECURITY_INGEST_SECRET
Content-Type: application/json

{
  "project_slug": "lead-gen-system",
  "event_type": "failed_login",
  "severity": "warning",
  "description": "3 failed login attempts from same IP",
  "ip_address": "1.2.3.4"
}`}</pre>
        </div>
        <p className="text-xs text-indigo-600">
          See <code className="bg-indigo-100 px-1 rounded">docs/SECURITY_CLIENT_SNIPPETS.md</code> for copy-paste helpers for every project type.
        </p>
      </div>
    </div>
  )
}
