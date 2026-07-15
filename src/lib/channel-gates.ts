/**
 * Enterprise Channel Gates (D-008) — the one gate framework every product's
 * progress on every delivery channel is measured against. Generic by
 * design: the same 11 gates apply whether the channel is a website, a
 * mobile app, a desktop app, or an API, so no channel gets its own
 * competing lifecycle definition.
 *
 * ECG = Enterprise Channel Gate. Levels run 0 (nothing started) to 10
 * (live in production).
 */
export type ChannelGateLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10

export interface ChannelGateDefinition {
  level: ChannelGateLevel
  code: string
  name: string
  description: string
}

export const CHANNEL_GATES: ChannelGateDefinition[] = [
  { level: 0, code: 'ECG-0', name: 'Not Started', description: 'No delivery activity on this channel. Not yet assessed or planned.' },
  { level: 1, code: 'ECG-1', name: 'Channel Assessed', description: 'Feasibility and business case reviewed for this channel. No build committed.' },
  { level: 2, code: 'ECG-2', name: 'Requirements Defined', description: 'Scope, target users, and constraints documented for this channel.' },
  { level: 3, code: 'ECG-3', name: 'Design Approved', description: 'UX and technical architecture approved for this channel.' },
  { level: 4, code: 'ECG-4', name: 'Build In Progress', description: 'Implementation underway for this channel.' },
  { level: 5, code: 'ECG-5', name: 'Build Complete', description: 'Feature-complete for this channel, not yet verified.' },
  { level: 6, code: 'ECG-6', name: 'Verification & QA', description: 'Testing and quality verification in progress for this channel.' },
  { level: 7, code: 'ECG-7', name: 'Compliance & Store Readiness', description: 'Store listing, certificates, platform policies, or equivalent channel-specific requirements satisfied.' },
  { level: 8, code: 'ECG-8', name: 'Staged Release', description: 'Available to a limited audience (beta or staged rollout) on this channel.' },
  { level: 9, code: 'ECG-9', name: 'Founder Gate Review', description: 'Final governance review pending Founder approval to go live on this channel.' },
  { level: 10, code: 'ECG-10', name: 'Live in Production', description: 'Channel is live, supported, and monitored.' },
]

export function getChannelGate(level: ChannelGateLevel): ChannelGateDefinition {
  const gate = CHANNEL_GATES.find(g => g.level === level)
  if (!gate) throw new Error(`Unknown channel gate level: ${level}`)
  return gate
}

export type DeliveryChannel =
  | 'Responsive Web'
  | 'Progressive Web App'
  | 'iOS'
  | 'Android'
  | 'Windows Desktop'
  | 'macOS Desktop'
  | 'API'

export const DELIVERY_CHANNELS: DeliveryChannel[] = [
  'Responsive Web',
  'Progressive Web App',
  'iOS',
  'Android',
  'Windows Desktop',
  'macOS Desktop',
  'API',
]
