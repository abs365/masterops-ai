const SEVERITY_EMOJI: Record<string, string> = {
  info: 'ℹ️',
  warning: '⚠️',
  critical: '🚨',
  emergency: '🆘',
}

export async function sendTelegramAlert(
  title: string,
  message: string,
  severity: string
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!token || !chatId) return

  const emoji = SEVERITY_EMOJI[severity] ?? 'ℹ️'
  const text = [
    `${emoji} *MasterOps Alert*`,
    `*Severity:* ${severity.toUpperCase()}`,
    `*Title:* ${title}`,
    message ? `*Details:* ${message}` : null,
    `_${new Date().toUTCString()}_`,
  ]
    .filter(Boolean)
    .join('\n')

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      }),
      signal: AbortSignal.timeout(5000),
    })
  } catch {
    // Telegram is best-effort — never fail the main operation
  }
}
