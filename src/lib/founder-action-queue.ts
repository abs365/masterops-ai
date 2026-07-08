import { getDashboardStats } from '@/lib/dashboard-stats'
import { getVercelData } from '@/lib/deployment-status'

export interface FounderQueueItem {
  title: string
  detail: string
  severity: 'critical' | 'warning' | 'info'
  href?: string
}

export async function getFounderActionQueue(): Promise<FounderQueueItem[]> {
  const items: FounderQueueItem[] = []
  const [stats, vercel] = await Promise.all([getDashboardStats(), getVercelData()])

  if (stats.down > 0) {
    items.push({
      title: `${stats.down} platform${stats.down === 1 ? '' : 's'} down`,
      detail: 'Review Platform Health for affected projects.',
      severity: 'critical',
    })
  }
  if (stats.criticalAlerts > 0) {
    items.push({
      title: `${stats.criticalAlerts} critical alert${stats.criticalAlerts === 1 ? '' : 's'} open`,
      detail: 'Review the Alerts Centre below.',
      severity: 'critical',
      href: '/alerts',
    })
  }

  const failedDeployments = vercel.deployments.filter(d => d.deployment?.state === 'ERROR')
  if (failedDeployments.length > 0) {
    items.push({
      title: `${failedDeployments.length} failed deployment${failedDeployments.length === 1 ? '' : 's'}`,
      detail: failedDeployments.map(d => d.project_name).join(', '),
      severity: 'critical',
      href: '/deployments',
    })
  }

  if (!process.env.VERCEL_TOKEN) {
    items.push({ title: 'Vercel token not configured', detail: 'Set VERCEL_TOKEN to enable deployment tracking.', severity: 'warning', href: '/deployments' })
  }
  if (!process.env.GITHUB_TOKEN) {
    items.push({ title: 'GitHub token not configured', detail: 'Set GITHUB_TOKEN to enable repository and CI tracking.', severity: 'warning', href: '/deployments' })
  }
  if (!process.env.RESEND_API_KEY) {
    items.push({ title: 'Email alerts not configured', detail: 'Set RESEND_API_KEY so critical alerts can email the Founder.', severity: 'warning' })
  }
  if (!process.env.CRON_SECRET) {
    items.push({ title: 'Monitoring endpoint unprotected', detail: 'Set CRON_SECRET to require authentication on the monitoring cron endpoint.', severity: 'warning' })
  }
  if (!process.env.SUPABASE_ACCESS_TOKEN || !process.env.SUPABASE_ORG_ID) {
    items.push({ title: 'Automated backup checks not configured', detail: 'Set SUPABASE_ACCESS_TOKEN and SUPABASE_ORG_ID to verify backups automatically.', severity: 'info', href: '/backups' })
  }

  return items
}
