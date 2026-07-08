import { ENTERPRISE_REGISTRY } from '@/lib/enterprise-registry'

export type ServiceReadiness = 'Implemented' | 'Partially Implemented' | 'Foundation Only' | 'Not Started'

export interface SharedServiceEntry {
  slug: string
  name: string
  purpose: string
  currentStatus: string
  intendedConsumers: string[]
  readiness: ServiceReadiness
  futureRoadmap: string
}

const registeredBusinessCount = ENTERPRISE_REGISTRY.length

/**
 * The Enterprise Shared Services catalogue (D-007) — the one place that
 * documents every shared capability MasterOps offers or intends to offer
 * to the whole portfolio. This is a documentation/foundation package: it
 * does not build or migrate any of these services, only records their
 * real current state so future work packages have one accurate starting
 * point instead of re-discovering it each time.
 *
 * Every `currentStatus` line below is grounded in what actually exists in
 * this codebase today (verified by reading the relevant files, not
 * assumed) — no integration, capability, or roadmap detail is invented.
 */
export const SHARED_SERVICES_CATALOGUE: SharedServiceEntry[] = [
  {
    slug: 'enterprise-notifications',
    name: 'Enterprise Notifications',
    purpose: 'Deliver critical and emergency alerts to the Founder through external channels, decoupled from any single product.',
    currentStatus: '`notify()` (src/lib/notifications) dispatches to Telegram and Resend email in parallel. Triggered today only by the monitoring cron’s critical/emergency alerts and the security event ingest endpoint.',
    intendedConsumers: ['MasterOps monitoring', `Future: any of the ${registeredBusinessCount} registered Enterprise businesses needing Founder-facing alert delivery`],
    readiness: 'Implemented',
    futureRoadmap: 'Generalize `notify()` into a callable service other products can invoke directly, instead of each product building its own Telegram/email dispatch.',
  },
  {
    slug: 'enterprise-audit',
    name: 'Enterprise Audit',
    purpose: 'Maintain a durable, queryable record of significant events across the Enterprise for accountability and incident review.',
    currentStatus: 'Not implemented as a general capability. `security_events` (ingested via `/api/security/log-event`) is the closest existing capability, but it only captures security-flagged events, not general configuration or data changes.',
    intendedConsumers: ['Future: Enterprise Assurance review', 'Future: any product needing a change/action history'],
    readiness: 'Foundation Only',
    futureRoadmap: 'Define a general Enterprise Audit event schema (actor, action, target, timestamp) broader than security_events, and decide whether security_events becomes a subset of it or stays separate.',
  },
  {
    slug: 'enterprise-documents',
    name: 'Enterprise Documents',
    purpose: 'Centralised storage and retrieval of Enterprise and per-business documents (policies, evidence packages, contracts).',
    currentStatus: 'Not implemented. No file storage capability exists in MasterOps today (confirmed in D-005’s Integration Status: Storage is marked Not Integrated).',
    intendedConsumers: ['Future: Enterprise governance and evidence archival', 'Future: per-business documentation'],
    readiness: 'Not Started',
    futureRoadmap: 'Likely built on Supabase Storage once a real need is confirmed. The Enterprise Registry’s `documentationLocation` field (D-006) already gives each business a place to point at where its docs live today, without requiring this service to exist first.',
  },
  {
    slug: 'enterprise-search',
    name: 'Enterprise Search',
    purpose: 'Unified search across Enterprise data (portfolio, alerts, reports, documents) for the Founder and future admins.',
    currentStatus: 'Not implemented. No search library, index, or search UI exists anywhere in the codebase.',
    intendedConsumers: ['Future: Founder-facing search across every Enterprise page'],
    readiness: 'Not Started',
    futureRoadmap: 'Depends on Enterprise Documents and a stable Enterprise Audit surface existing first, so there is a real corpus worth searching.',
  },
  {
    slug: 'enterprise-reporting',
    name: 'Enterprise Reporting',
    purpose: 'Recurring, Founder-facing operational summaries synthesised from live Enterprise data.',
    currentStatus: 'Implemented for MasterOps itself — `/reports`, the `daily_reports` table, and `/api/reports/daily`. AI-generated (OpenAI primary, Anthropic fallback) with an honest template fallback when no AI key is configured.',
    intendedConsumers: ['Founder (daily operational summary)', 'Future: portfolio-wide reporting once more than one business has live MasterOps data'],
    readiness: 'Implemented',
    futureRoadmap: 'Extend report generation to synthesise across multiple businesses using the Enterprise Registry, once a second business is actually connected.',
  },
  {
    slug: 'integration-registry',
    name: 'Integration Registry',
    purpose: 'One place documenting every external integration MasterOps depends on, its configuration requirement, and its current connection state.',
    currentStatus: 'Partially implemented. Every integration touchpoint (Vercel, GitHub, Resend, Telegram, Supabase Management API, Upstash Redis, OpenAI/Anthropic) is already documented in `.env.example` and surfaced live on the Operations Centre’s Integration Status panel (D-005) — but there is no single formal registry model yet; today it is implicit across two places.',
    intendedConsumers: ['Operations Centre (D-005, existing consumer)', 'Future: any product needing to declare its own integrations in one place'],
    readiness: 'Partially Implemented',
    futureRoadmap: 'Formalize `.env.example` and D-005’s Integration Status into one `IntegrationRegistry` model. Deliberately not done in this package, to avoid modifying D-005’s already-approved, deployed Integration Status panel outside its own scoped review.',
  },
  {
    slug: 'enterprise-identity',
    name: 'Enterprise Identity',
    purpose: 'Establish who is acting within the Enterprise and enforce access control across every product and shared service.',
    currentStatus: 'Not implemented. No authentication or authorization provider exists anywhere in this codebase — no middleware, no session handling. `ADMIN_EMAILS` is a display-only environment variable, not an enforced check (consistent with D-005’s Integration Status finding).',
    intendedConsumers: ['Every current and future Enterprise service and product, once it exists'],
    readiness: 'Foundation Only',
    futureRoadmap: 'Choose and wire a real identity provider before any other shared service can assume a real "current user" — explicitly out of scope for this work package, which is foundation-only by instruction.',
  },
  {
    slug: 'enterprise-metadata-services',
    name: 'Enterprise Metadata Services',
    purpose: 'Single source of truth for every business’s Enterprise profile — name, stage, ownership, contacts, and links — consumed by every Enterprise page.',
    currentStatus: `Implemented — the Enterprise Registry (D-006), consumed today by the Portfolio Workspace and the Operations Centre’s Founder Action Queue. Currently holds ${registeredBusinessCount} registered Enterprise businesses.`,
    intendedConsumers: ['Portfolio Workspace (existing consumer)', 'Operations Centre (existing consumer)', 'This Shared Services catalogue itself'],
    readiness: 'Implemented',
    futureRoadmap: 'Add real values (owner, contacts, URLs, category) as the Founder confirms them per business; extend consumption to any future Enterprise page needing business identity.',
  },
]

export function getSharedService(slug: string): SharedServiceEntry | undefined {
  return SHARED_SERVICES_CATALOGUE.find(s => s.slug === slug)
}
