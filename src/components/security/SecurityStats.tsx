import { createClient } from '@/lib/supabase/server'
import { ShieldAlert, ShieldX, Siren, Clock } from 'lucide-react'
import { StatCard } from '@/components/dashboard/StatCard'

async function getSecurityStats() {
  try {
    const supabase = await createClient()
    const yesterday = new Date(Date.now() - 86400000).toISOString()

    const [all, critical, emergency, recent] = await Promise.all([
      supabase.from('security_events').select('id', { count: 'exact', head: true }),
      supabase.from('security_events').select('id', { count: 'exact', head: true }).eq('severity', 'critical'),
      supabase.from('security_events').select('id', { count: 'exact', head: true }).eq('severity', 'emergency'),
      supabase.from('security_events').select('id', { count: 'exact', head: true }).gte('created_at', yesterday),
    ])

    return {
      total: all.count ?? 0,
      critical: critical.count ?? 0,
      emergency: emergency.count ?? 0,
      last24h: recent.count ?? 0,
    }
  } catch {
    return { total: 0, critical: 0, emergency: 0, last24h: 0 }
  }
}

export async function SecurityStats() {
  const s = await getSecurityStats()
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard title="Total Events" value={s.total} icon={ShieldAlert} color="default" />
      <StatCard title="Critical" value={s.critical} icon={ShieldX} color={s.critical > 0 ? 'red' : 'default'} />
      <StatCard title="Emergency" value={s.emergency} icon={Siren} color={s.emergency > 0 ? 'red' : 'default'} />
      <StatCard title="Last 24 Hours" value={s.last24h} icon={Clock} color={s.last24h > 0 ? 'yellow' : 'default'} />
    </div>
  )
}
