export type ProjectStatus = 'online' | 'slow' | 'warning' | 'down' | 'unknown'
export type AlertSeverity = 'info' | 'warning' | 'critical' | 'emergency'
export type AlertStatus = 'open' | 'acknowledged' | 'resolved'
export type SecuritySeverity = 'info' | 'warning' | 'critical' | 'emergency'

export type ProjectCategory =
  | 'saas' | 'leadgen' | 'education' | 'removals'
  | 'logistics' | 'events' | 'operations' | 'internal' | 'general'

export interface Project {
  id: string
  name: string
  slug: string
  url: string | null
  github_repo: string | null
  vercel_project_id: string | null
  supabase_project_id: string | null
  status: ProjectStatus
  response_time_ms: number | null
  last_checked_at: string | null
  category: ProjectCategory
  created_at: string
}

export interface Alert {
  id: string
  project_id: string | null
  title: string
  message: string | null
  severity: AlertSeverity
  status: AlertStatus
  created_at: string
  project?: Pick<Project, 'name' | 'slug'>
}

export interface SecurityEvent {
  id: string
  project_id: string | null
  event_type: string | null
  severity: SecuritySeverity | null
  description: string | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
  project?: Pick<Project, 'name' | 'slug'>
}

export interface ApiUsageLog {
  id: string
  project_id: string | null
  provider: string | null
  endpoint: string | null
  request_count: number
  estimated_cost: number
  created_at: string
}

export interface DailyReport {
  id: string
  report_date: string
  summary: string | null
  risks: string | null
  recommendations: string | null
  created_at: string
}

export interface DashboardStats {
  totalProjects: number
  onlineProjects: number
  downProjects: number
  openAlerts: number
  criticalSecurityEvents: number
  estimatedApiCost: number
}
