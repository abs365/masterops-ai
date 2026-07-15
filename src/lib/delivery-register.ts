import { ENTERPRISE_REGISTRY, EnterpriseProfile } from '@/lib/enterprise-registry'
import { DELIVERY_CHANNELS, DeliveryChannel, ChannelGateLevel, getChannelGate } from '@/lib/channel-gates'

export interface DeliveryChannelStatus {
  channel: DeliveryChannel
  gateLevel: ChannelGateLevel
  gateName: string
  assessmentBasis: string
}

export interface ProductDeliveryRecord {
  slug: string
  businessName: string
  channels: DeliveryChannelStatus[]
}

/**
 * The Enterprise Product Delivery Register (D-008) — current Channel Gate
 * standing for every registered Enterprise product, across all 7
 * Enterprise delivery channels. Derived from the Enterprise Registry
 * (D-006); no separate product list is maintained here.
 *
 * Every gate below is grounded in what this system can actually verify
 * today, not invented:
 * - Responsive Web is set to ECG-10 (Live in Production) only when the
 *   product's Enterprise Registry `productionUrl` is on file — a real,
 *   already-confirmed fact, not a new claim.
 * - Every other channel, and Responsive Web for every product without a
 *   confirmed `productionUrl`, defaults to ECG-0 (Not Started). D-008 is
 *   an Enterprise governance capability; it does not inspect product
 *   repositories, so no higher gate can be honestly claimed for PWA,
 *   iOS, Android, Windows Desktop, macOS Desktop, or API on any product
 *   without that review happening as its own, separately scoped work.
 *
 * Adding a future channel assessment means recording it here once a real
 * review has happened — never by advancing a gate on assumption.
 */
function assessChannel(profile: EnterpriseProfile, channel: DeliveryChannel): DeliveryChannelStatus {
  if (channel === 'Responsive Web' && profile.productionUrl) {
    return {
      channel,
      gateLevel: 10,
      gateName: getChannelGate(10).name,
      assessmentBasis: `Enterprise Registry productionUrl on file (${profile.productionUrl}).`,
    }
  }

  return {
    channel,
    gateLevel: 0,
    gateName: getChannelGate(0).name,
    assessmentBasis: 'Not yet assessed under D-008 — no product-repository-level review has been performed for this channel.',
  }
}

export function getDeliveryRegister(): ProductDeliveryRecord[] {
  return ENTERPRISE_REGISTRY.map(profile => ({
    slug: profile.slug,
    businessName: profile.businessName,
    channels: DELIVERY_CHANNELS.map(channel => assessChannel(profile, channel)),
  }))
}

export interface ReadinessSummary {
  totalCombinations: number
  liveCombinations: number
  notStartedCombinations: number
  byChannel: { channel: DeliveryChannel; liveCount: number; totalProducts: number }[]
}

export function getReadinessSummary(): ReadinessSummary {
  const register = getDeliveryRegister()
  const totalCombinations = register.length * DELIVERY_CHANNELS.length
  let liveCombinations = 0
  let notStartedCombinations = 0

  const byChannel = DELIVERY_CHANNELS.map(channel => {
    let liveCount = 0
    for (const record of register) {
      const status = record.channels.find(c => c.channel === channel)
      if (status && status.gateLevel === 10) liveCount++
    }
    return { channel, liveCount, totalProducts: register.length }
  })

  for (const record of register) {
    for (const status of record.channels) {
      if (status.gateLevel === 10) liveCombinations++
      if (status.gateLevel === 0) notStartedCombinations++
    }
  }

  return { totalCombinations, liveCombinations, notStartedCombinations, byChannel }
}
