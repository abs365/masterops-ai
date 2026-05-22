import { createClient } from '@/lib/supabase/server'
import { DollarSign, TrendingUp, Database, Zap } from 'lucide-react'
import { StatCard } from '@/components/dashboard/StatCard'
import { formatCost } from '@/lib/utils'

async function getCostData() {
  try {
    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

    const [todayRes, yesterdayRes] = await Promise.all([
      supabase
        .from('api_usage_logs')
        .select('provider, endpoint, estimated_cost, request_count')
        .gte('created_at', `${today}T00:00:00Z`),
      supabase
        .from('api_usage_logs')
        .select('estimated_cost')
        .gte('created_at', `${yesterday}T00:00:00Z`)
        .lt('created_at', `${today}T00:00:00Z`),
    ])

    const todayLogs = todayRes.data ?? []
    const yesterdayLogs = yesterdayRes.data ?? []

    const totalToday = todayLogs.reduce((s, r) => s + (r.estimated_cost ?? 0), 0)
    const totalYesterday = yesterdayLogs.reduce((s, r) => s + (r.estimated_cost ?? 0), 0)

    const byProvider: Record<string, { cost: number; requests: number }> = {}
    for (const log of todayLogs) {
      if (!log.provider) continue
      if (!byProvider[log.provider]) byProvider[log.provider] = { cost: 0, requests: 0 }
      byProvider[log.provider].cost += log.estimated_cost ?? 0
      byProvider[log.provider].requests += log.request_count ?? 0
    }

    const byEndpoint: Record<string, number> = {}
    for (const log of todayLogs) {
      const key = `${log.provider ?? 'unknown'} / ${log.endpoint ?? 'unknown'}`
      byEndpoint[key] = (byEndpoint[key] ?? 0) + (log.estimated_cost ?? 0)
    }
    const topEndpoints = Object.entries(byEndpoint)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)

    return { totalToday, totalYesterday, byProvider, topEndpoints, logCount: todayLogs.length }
  } catch {
    return { totalToday: 0, totalYesterday: 0, byProvider: {}, topEndpoints: [], logCount: 0 }
  }
}

export async function CostDashboard() {
  const d = await getCostData()
  const dailyLimit = parseFloat(process.env.DAILY_COST_LIMIT_GBP ?? '10')
  const hasData = d.logCount > 0

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Cost Today"
          value={formatCost(d.totalToday)}
          icon={DollarSign}
          color={d.totalToday > dailyLimit ? 'red' : d.totalToday > dailyLimit * 0.7 ? 'yellow' : 'default'}
          sub={`limit: ${formatCost(dailyLimit)}`}
        />
        <StatCard
          title="Cost Yesterday"
          value={formatCost(d.totalYesterday)}
          icon={TrendingUp}
          color="default"
        />
        <StatCard
          title="Providers Active"
          value={Object.keys(d.byProvider).length}
          icon={Zap}
          color="indigo"
          sub="today"
        />
        <StatCard
          title="API Calls"
          value={Object.values(d.byProvider).reduce((s, v) => s + v.requests, 0)}
          icon={Database}
          color="default"
          sub="today"
        />
      </div>

      {!hasData ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center space-y-3">
          <p className="text-sm font-medium text-gray-600">No cost data recorded yet</p>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            Projects should send API usage logs to MasterOps using <code className="bg-gray-100 px-1 rounded">/api/costs/log-usage</code>.
            Set <code className="bg-gray-100 px-1 rounded">USAGE_INGEST_SECRET</code> to protect the endpoint.
          </p>
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 text-left font-mono text-xs text-gray-600 max-w-lg mx-auto overflow-x-auto">
            <pre>{`POST /api/costs/log-usage
x-masterops-secret: YOUR_SECRET

{
  "project_slug": "lead-gen-system",
  "provider": "google_maps",
  "endpoint": "places_text_search",
  "request_count": 1,
  "estimated_cost": 0.032
}`}</pre>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cost by provider */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Cost by Provider — Today</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100">
                  <th className="px-5 py-2 text-left font-medium">Provider</th>
                  <th className="px-5 py-2 text-right font-medium">Requests</th>
                  <th className="px-5 py-2 text-right font-medium">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {Object.entries(d.byProvider)
                  .sort(([, a], [, b]) => b.cost - a.cost)
                  .map(([provider, { cost, requests }]) => (
                    <tr key={provider}>
                      <td className="px-5 py-3 font-medium text-gray-800 capitalize">{provider.replace('_', ' ')}</td>
                      <td className="px-5 py-3 text-right text-gray-500">{requests.toLocaleString()}</td>
                      <td className="px-5 py-3 text-right font-mono text-gray-700">{formatCost(cost)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Top endpoints */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Top Endpoints by Cost — Today</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100">
                  <th className="px-5 py-2 text-left font-medium">Endpoint</th>
                  <th className="px-5 py-2 text-right font-medium">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {d.topEndpoints.map(([endpoint, cost]) => (
                  <tr key={endpoint}>
                    <td className="px-5 py-3 text-gray-700 truncate max-w-xs font-mono text-xs">{endpoint}</td>
                    <td className="px-5 py-3 text-right font-mono text-gray-700">{formatCost(cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
