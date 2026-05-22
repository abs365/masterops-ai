interface ReportData {
  projects: Array<{ name: string; status: string; response_time_ms: number | null; category: string }>
  alerts: Array<{ severity: string; title: string; status: string }>
  secEvents: Array<{ severity: string; event_type: string | null }>
  costToday: number
  costYesterday: number
  dailyLimit: number
}

function templateReport(d: ReportData) {
  const online = d.projects.filter(p => p.status === 'online').length
  const down = d.projects.filter(p => p.status === 'down').length
  const slow = d.projects.filter(p => p.status === 'slow').length
  const openAlerts = d.alerts.filter(a => a.status === 'open').length
  const criticalAlerts = d.alerts.filter(a => a.severity === 'critical' || a.severity === 'emergency').length
  const criticalSec = d.secEvents.filter(e => e.severity === 'critical' || e.severity === 'emergency').length
  const costSpike = d.costYesterday > 0 && d.costToday > d.costYesterday * 2

  const risks: string[] = []
  const actions: string[] = []

  if (down > 0) {
    risks.push(`${down} project(s) are currently DOWN — immediate investigation required`)
    actions.push(`URGENT: Restore downed projects and root-cause the failure`)
  }
  if (slow > 0) {
    risks.push(`${slow} project(s) responding slowly (>2000ms)`)
    actions.push(`Investigate slow projects — check database queries and server resources`)
  }
  if (criticalAlerts > 0) {
    risks.push(`${criticalAlerts} critical/emergency alert(s) are open`)
    actions.push(`Review and acknowledge all critical alerts in /alerts`)
  }
  if (criticalSec > 0) {
    risks.push(`${criticalSec} critical security event(s) recorded`)
    actions.push(`Investigate security events in /security and block suspicious IPs`)
  }
  if (d.costToday > d.dailyLimit) {
    risks.push(`API cost today ($${d.costToday.toFixed(2)}) exceeds daily limit ($${d.dailyLimit})`)
    actions.push(`Review /costs for unexpected API usage spikes`)
  } else if (costSpike) {
    risks.push(`API cost today ($${d.costToday.toFixed(2)}) is 2x+ yesterday ($${d.costYesterday.toFixed(2)})`)
    actions.push(`Investigate cost spike in /costs — check for loops or abuse`)
  }

  if (risks.length === 0) risks.push('No active risks detected — system is healthy')
  if (actions.length === 0) actions.push('Maintain current monitoring cadence')
  actions.push('Verify latest Vercel deployments succeeded for all projects')
  actions.push('Confirm Supabase backups are running on schedule')

  const healthLine = [
    `${d.projects.length} projects monitored`,
    `${online} online`,
    down > 0 ? `${down} DOWN` : null,
    slow > 0 ? `${slow} slow` : null,
  ].filter(Boolean).join(' · ')

  const summary = [
    `**Project Health:** ${healthLine}.`,
    openAlerts > 0 ? `**Alerts:** ${openAlerts} open alert(s), ${criticalAlerts} critical.` : '**Alerts:** No open alerts.',
    d.secEvents.length > 0 ? `**Security:** ${d.secEvents.length} event(s) today, ${criticalSec} critical.` : '**Security:** No security events today.',
    `**API Cost:** $${d.costToday.toFixed(4)} today vs $${d.costYesterday.toFixed(4)} yesterday (limit: $${d.dailyLimit}).`,
  ].join(' ')

  return {
    summary,
    risks: risks.map(r => `• ${r}`).join('\n'),
    recommendations: actions.map((a, i) => `${i + 1}. ${a}`).join('\n'),
  }
}

async function generateWithOpenAI(prompt: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY
  if (!key) return null

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 800,
        messages: [
          { role: 'system', content: 'You are an expert operations manager writing a concise daily report for a business owner. Use plain English. No markdown headers. Be direct about risks. Limit to 3 paragraphs.' },
          { role: 'user', content: prompt },
        ],
      }),
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.choices?.[0]?.message?.content ?? null
  } catch {
    return null
  }
}

async function generateWithAnthropic(prompt: string): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return null

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
        system: 'You are an expert operations manager writing a concise daily report for a business owner. Use plain English. No markdown headers. Be direct about risks. Limit to 3 paragraphs.',
      }),
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.content?.[0]?.text ?? null
  } catch {
    return null
  }
}

export async function generateDailyReport(d: ReportData) {
  const template = templateReport(d)

  const hasAI = !!(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY)
  if (!hasAI) {
    return { ...template, ai_generated: false }
  }

  const prompt = `
Write a daily operational summary for a business owner. Today's data:
- Projects: ${d.projects.length} total, ${d.projects.filter(p => p.status === 'online').length} online, ${d.projects.filter(p => p.status === 'down').length} down, ${d.projects.filter(p => p.status === 'slow').length} slow
- Open alerts: ${d.alerts.filter(a => a.status === 'open').length} (critical: ${d.alerts.filter(a => a.severity === 'critical' || a.severity === 'emergency').length})
- Security events today: ${d.secEvents.length} (critical: ${d.secEvents.filter(e => e.severity === 'critical').length})
- API cost today: $${d.costToday.toFixed(4)} vs $${d.costYesterday.toFixed(4)} yesterday (limit: $${d.dailyLimit})
- Template summary: ${template.summary}
- Known risks: ${template.risks}

Write 3 short paragraphs: (1) overall situation, (2) what needs attention today, (3) what looks good.
  `.trim()

  const aiSummary = (await generateWithOpenAI(prompt)) ?? (await generateWithAnthropic(prompt))

  return {
    summary: aiSummary ?? template.summary,
    risks: template.risks,
    recommendations: template.recommendations,
    ai_generated: !!aiSummary,
  }
}
