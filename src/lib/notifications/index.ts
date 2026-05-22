import { sendTelegramAlert } from './telegram'
import { sendEmailAlert } from './email'

export async function notify(title: string, message: string, severity: string): Promise<void> {
  await Promise.allSettled([
    sendTelegramAlert(title, message, severity),
    sendEmailAlert(title, message, severity),
  ])
}
