export type IntegrationState = 'connected' | 'not_configured' | 'not_integrated'

export interface IntegrationRow {
  name: string
  state: IntegrationState
  detail: string
}

export function getIntegrationStatus(): IntegrationRow[] {
  const dbConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    !!process.env.SUPABASE_SERVICE_ROLE_KEY

  const emailConfigured = !!process.env.RESEND_API_KEY
  const backgroundConfigured = !!process.env.CRON_SECRET

  return [
    {
      name: 'Database',
      state: dbConfigured ? 'connected' : 'not_configured',
      detail: dbConfigured
        ? 'Supabase connected — URL, anon key, and service role key are all present.'
        : 'Required Supabase environment variables are missing.',
    },
    {
      name: 'Authentication',
      state: 'not_integrated',
      detail: 'No authentication provider is implemented in MasterOps. ADMIN_EMAILS is a display label only — it is not an enforced access control.',
    },
    {
      name: 'Email',
      state: emailConfigured ? 'connected' : 'not_configured',
      detail: emailConfigured
        ? 'Resend is configured — alert emails will send.'
        : 'RESEND_API_KEY is not set. Alert emails are silently skipped.',
    },
    {
      name: 'Payments',
      state: 'not_integrated',
      detail: 'No payments capability exists in MasterOps.',
    },
    {
      name: 'Storage',
      state: 'not_integrated',
      detail: 'No file storage capability exists in MasterOps beyond the Supabase database itself.',
    },
    {
      name: 'Background Services',
      state: backgroundConfigured ? 'connected' : 'not_configured',
      detail: backgroundConfigured
        ? 'The monitoring cron endpoint is protected by CRON_SECRET.'
        : 'CRON_SECRET is not set — the monitoring cron endpoint currently accepts unauthenticated calls.',
    },
  ]
}
