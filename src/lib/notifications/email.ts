const SEVERITY_COLOUR: Record<string, string> = {
  info: '#3b82f6',
  warning: '#f59e0b',
  critical: '#ef4444',
  emergency: '#7f1d1d',
}

export async function sendEmailAlert(
  title: string,
  message: string,
  severity: string
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const to = process.env.ALERT_EMAIL_TO
  const from = process.env.ALERT_EMAIL_FROM ?? 'alerts@masterops.ai'

  if (!apiKey || !to) return

  const colour = SEVERITY_COLOUR[severity] ?? SEVERITY_COLOUR.info
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <div style="background:${colour};padding:12px 20px;border-radius:8px 8px 0 0">
        <h2 style="color:#fff;margin:0;font-size:16px">
          MasterOps Alert — ${severity.toUpperCase()}
        </h2>
      </div>
      <div style="border:1px solid #e5e7eb;border-top:none;padding:20px;border-radius:0 0 8px 8px">
        <h3 style="margin:0 0 8px;color:#111827">${title}</h3>
        ${message ? `<p style="color:#4b5563;margin:0 0 16px">${message}</p>` : ''}
        <p style="color:#9ca3af;font-size:12px;margin:0">${new Date().toUTCString()}</p>
      </div>
    </div>
  `

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `[MasterOps ${severity.toUpperCase()}] ${title}`,
        html,
      }),
      signal: AbortSignal.timeout(8000),
    })
  } catch {
    // Email is best-effort — never fail the main operation
  }
}
