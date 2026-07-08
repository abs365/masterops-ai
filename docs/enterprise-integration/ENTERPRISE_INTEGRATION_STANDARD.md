# Enterprise Integration Standard (EIS-001)

**Programme:** MasterOps Enterprise Integration
**Work Package:** EIS-001
**Status:** Approved — planning and governance deliverable only, no integration implemented

This is the mandatory standard for integrating every current and future business into the Enterprise. It generalises the boundary decisions already made in `ELBOLD_INTEGRATION_PLAN.md` (the first, concrete worked example) into a reusable rule set, so every future onboarding is a checklist application, not a fresh architecture debate.

---

## Executive Summary

MasterOps (D-001–D-007) already has a working, generic Enterprise layer: a Registry for business identity, an Operations Centre for operational health, and a Shared Services catalogue. What was missing was a *standard* — a single document saying, for any business, what data it publishes, who owns each kind of signal, what "connected" minimally means, and the repeatable process for getting there. This document is that standard.

Three ownership boundaries, already applied once (in the ELBOLD plan) and now made permanent rules:

1. **MasterOps owns Enterprise, Governance, Portfolio, Operations, and Shared Services** — operational/technical signals, business identity, and cross-portfolio infrastructure concerns.
2. **Master Growth OS owns Growth, Discovery, Campaigns, and Opportunity Intelligence** — commercial and growth signals.
3. **Individual businesses own Customer operations, Commercial operations, Business logic, and Product data** — everything else stays inside the business, always.

No integration is implemented by this document. It defines the rules the next implementation package must follow.

---

## 1. Enterprise Integration Principles

1. **Operational data flows to MasterOps; commercial data flows to Master Growth OS.** No signal is ever routed to both, and no business builds its own cross-product analytics (both already established in prior Master Growth OS decisions and the ELBOLD plan).
2. **No PII, no financial data, no customer or vendor records ever leave a business.** This is a hard boundary, not a default that can be relaxed per-integration.
3. **Pull before push.** MasterOps prefers reading a business's existing public infrastructure (production URL, Vercel API, GitHub API) over requiring the business to build new outbound integrations. A business should reach baseline connectivity (§7, Baseline) with zero code changes on its own side wherever possible.
4. **No invented data.** Every signal, health status, or Founder Action Queue item must trace to a real, verifiable source. Where no real signal exists yet, the honest state is "not connected" or "not started" — never a plausible placeholder.
5. **Reuse before build.** A business's onboarding must use the existing Enterprise Registry, Operations Centre, and Shared Services models as-is. A new business is never a reason to fork a second version of any of these.
6. **Configuration before schema.** Business identity and integration wiring are captured in configuration (the Enterprise Registry, `projects` table fields already defined) wherever possible; new database schema is the last resort, not the first tool.
7. **Explicit approval per lifecycle stage.** No stage of onboarding (§8) begins until the previous one is complete and approved. This mirrors the phase discipline already used throughout the Foundation Programme (D-001–D-007).
8. **Architectural isolation is permanent, not transitional.** Separate database, separate auth, and separate deployment per business is the standing model — integration means shared visibility into defined signals, never shared infrastructure or shared credentials.

## 2. Enterprise Signal Standard

Four signal categories. Every signal a business could ever publish belongs to exactly one.

| Category | Definition | Owning Product | Examples |
|---|---|---|---|
| **Operational Signals** | Technical health and delivery state of the business's platform | **MasterOps** | Uptime, response time, deployment status, CI/build status, infrastructure cost, operational alerts |
| **Business Signals** | The business's own commercial and product data | **The individual business** (never published anywhere else) | Bookings, financial ledger, subscriptions, customer/vendor records, product inventory |
| **Governance Signals** | Accountability and audit-relevant events | **MasterOps** (aggregate/foundation level), sourced from each business's own audit trail if one exists | Admin action counts, governance decision volume — never the decision content itself unless a business explicitly chooses to publish it |
| **Growth Signals** | Acquisition, funnel, and marketing performance | **Master Growth OS** | Funnel stage counts (using the existing 6-stage vocabulary), MRR, campaign performance, opportunity intelligence |

**Enterprise Signal Catalogue** (concrete signals already supported by existing MasterOps capability, per business, once connected):

| Signal | Category | MasterOps Destination | Status |
|---|---|---|---|
| Uptime / response time | Operational | `projects.status`, Operations Centre Platform Health | Implemented (D-005), pull-based |
| Deployment state | Operational | Operations Centre Deployment Summary | Implemented (D-005), pull-based |
| CI / build status | Operational | Operations Centre Deployment Summary | Implemented (D-005), pull-based |
| Infrastructure cost | Operational | `api_usage_logs`, Operations Centre Cost Summary | Implemented (D-005) receiver, no business currently pushes to it |
| Operational alerts | Operational | `alerts` / `security_events`, Alerts Centre | Implemented (D-005) receiver, no business currently pushes to it |
| Business identity (name, stage, owner, contacts, URLs, category) | Enterprise Metadata (not one of the four signal categories — see §3) | Enterprise Registry | Implemented (D-006) |
| Governance/audit volume | Governance | Future Enterprise Audit (D-007, Foundation Only) | Not started |
| Funnel / commercial metrics | Growth | Master Growth OS Reporting API | Architected, not built |

## 3. Enterprise Metadata Standard

Every business must eventually provide the full `EnterpriseProfile` shape already defined in D-006 (`src/lib/enterprise-registry.ts`) — this standard does not define a new metadata model, it mandates use of the existing one:

**Required at onboarding (no business is added to the registry without these):**
- `slug`, `businessName`, `businessStage`, `dateAdded`, `lastReviewed`

**Progressive — may start `null`, filled in as confirmed (never fabricated to look complete):**
- `shortDescription`, `businessOwner`, `primaryWebsite`, `productionUrl`, `developmentUrl`, `gitRepository`, `documentationLocation`, `primaryContact`, `supportContact`, `businessCategory`

**Explicitly excluded from the Enterprise Registry, by standing rule (D-004A):** MasterOps Status is never a registry field — it is always derived live from `projects` table connectivity. A business's registry entry never asserts its own connection state.

## 4. Health Standard

The minimum health information every business should expose, mapped 1:1 onto capability MasterOps already has — no new health concept is introduced:

| Health Dimension | Minimum Signal | Existing MasterOps Mechanism |
|---|---|---|
| **Production** | A reachable production URL | `projects.url`, polled by the existing monitor cron |
| **Deployment** | A Vercel project the monitor can query | `projects.vercel_project_id`, read by `getVercelData()` |
| **Availability** | Uptime + response time, derived from Production | `projects.status`, `projects.response_time_ms` |
| **Monitoring** | Confirmation the monitor cron successfully reaches the business at least once | `projects.last_checked_at` non-null |
| **Documentation** | A location where the business's own docs live | Enterprise Registry `documentationLocation` |
| **Repository** | A GitHub repo the monitor can query for CI status | `projects.github_repo`, read by `getGitHubData()` |

A business is "minimally healthy" for Enterprise purposes once Production, Deployment, and Availability are live — Monitoring, Documentation, and Repository may lag without blocking Baseline (§8).

## 5. Founder Action Standard

Founder Action Queue items (Operations Centre, D-005) must fall into exactly one of three severities, each with a concrete qualification rule — never a subjective judgment call at generation time:

| Severity | Qualifies When | Examples |
|---|---|---|
| **Critical** | A live operational signal indicates the business is down, failing, or has an unresolved critical alert | Platform down, failed deployment, open critical/emergency alert |
| **Configuration** | A supported integration exists but its required credential/setting is missing | Vercel/GitHub token unset, monitoring endpoint unprotected, backup verification unconfigured |
| **Info** | An optional enhancement is available but nothing is broken | Automated backup checks not yet configured, optional Shared Service not yet consumed |

**Standing rule:** an item may only be generated from a signal already defined in the Enterprise Signal Catalogue (§2). No Founder Action Queue item may be invented from a business's Business or Growth Signals — those are out of MasterOps' ownership entirely (§7).

## 6. Shared Services Standard

Businesses may consume any Shared Service (D-007) at its current readiness — this standard does not change any service's readiness, only defines the consumption rule:

| Service | Readiness | Who May Consume It Today |
|---|---|---|
| Enterprise Metadata Services | Implemented | Automatic — every business in the Enterprise Registry is already a consumer by definition |
| Enterprise Reporting | Implemented (MasterOps-only) | Any business with a live `projects` row — its data can be included in MasterOps' own daily report |
| Enterprise Notifications | Implemented (MasterOps-only) | Not yet consumable by businesses directly — MasterOps-internal only, per D-007's own roadmap |
| Integration Registry | Partially Implemented | Not yet consumable — formalisation is unscoped future work (D-007) |
| Enterprise Audit | Foundation Only | Not consumable — does not exist as a capability yet |
| Enterprise Identity | Foundation Only | Not consumable — does not exist as a capability yet |
| Enterprise Documents | Not Started | Not consumable |
| Enterprise Search | Not Started | Not consumable |

A business is never required to consume a Shared Service to be onboarded — only the Enterprise Metadata Service (automatic) and the Health Standard (§4) signals are mandatory.

## 7. Integration Boundary Standard

| Owner | Owns |
|---|---|
| **MasterOps** | Enterprise (identity, registry), Governance (audit foundation), Portfolio (cross-business view), Operations (health, deployments, alerts), Shared Services (the catalogue itself and any implemented service) |
| **Master Growth OS** | Growth, Discovery, Campaigns, Opportunity Intelligence — all commercial/acquisition signals, from every business that reports to it |
| **Individual Businesses** | Customer operations, Commercial operations, Business logic, Product data — everything that makes the business what it is, never exported wholesale to either platform above |

This table is the same boundary already applied in the ELBOLD Integration Plan (§10 of that document) — this standard makes it the general rule rather than a one-off decision.

## 8. Enterprise Integration Lifecycle

Eight repeatable stages. No stage begins before the previous one is explicitly approved (Principle 7, §1).

1. **Proposal** — a business is named as a candidate for Enterprise integration.
2. **Plan** — an integration plan is written for that specific business, following the same eight-section shape as `ELBOLD_INTEGRATION_PLAN.md` (capabilities, signal flows, health, Founder actions, Shared Services, boundary application).
3. **Assure** — independent review of the plan (the same Founder/Claude/Codex assurance model already used throughout the Foundation Programme).
4. **Approve** — the Founder approves the plan's exact scope, in writing, before any implementation begins.
5. **Implement** — the approved scope is built. Per this standard's Principle 3 (pull before push), this is often no more than registering a `projects` row and setting existing fields — not new code.
6. **Verify** — local and production verification that the new signals are flowing correctly, following the same evidence-package discipline used in D-001–D-007 (local check, production check, before/after).
7. **Baseline** — the business's new connected state is recorded as the accepted baseline (matching the Programme Close-out Pack pattern already used after D-005).
8. **Operate** — the business's signals now flow automatically through existing MasterOps capability (Operations Centre, Founder Action Queue, Enterprise Reporting) with no further manual work, until its Enterprise Registry entry is next reviewed (`lastReviewed`).

## 9. Enterprise Integration Checklist

Reusable for every future onboarding — a direct generalisation of the ELBOLD plan's five-step sequence:

- [ ] Business has an Enterprise Registry entry (§3 required fields at minimum)
- [ ] Business has a `projects` row in masterops-ai (name, slug, production URL)
- [ ] `vercel_project_id` set, if the business deploys via Vercel
- [ ] `github_repo` set, if the business's code is on GitHub
- [ ] Monitor cron has successfully checked the business at least once (`last_checked_at` non-null)
- [ ] Enterprise Registry progressive fields reviewed with the Founder (owner, contacts, category — filled in or explicitly left `null`, never guessed)
- [ ] Boundary Standard (§7) confirmed — no Business or Growth Signal is being routed to MasterOps
- [ ] Decision recorded on whether cost/alert push integration (§2 catalogue) is worth building for this business, or explicitly deferred
- [ ] Evidence package written and approved (Plan → Assure → Approve → Implement → Verify, per §8)
- [ ] Baseline recorded

## 10. Future Roadmap

- **ELBOLD** — `ELBOLD_INTEGRATION_PLAN.md` already applies this standard's shape (written before the standard itself was formalised, but consistent with it). Its five-step sequence maps directly onto this document's Checklist (§9); no rework needed, only formal sign-off to proceed to Implement.
- **Master Growth OS** — itself both an Enterprise Registry entry (consumer of MasterOps) and the owner of all Growth Signals (§2, §7) from every other business. Its own onboarding into MasterOps follows this exact standard, independently of its role as the Growth Signal destination for others.
- **Future businesses (MeritBold next, per existing portfolio roadmap)** — onboard via Proposal → Plan → Assure → Approve → Implement → Verify → Baseline → Operate (§8), using the Checklist (§9) as the definition of done for each stage. No future business's integration plan should introduce a new signal category, ownership boundary, or metadata field without first amending this standard — this document, not the individual plan, is where that change belongs.

---

**Stop condition honoured:** no integration has been implemented for ELBOLD, Master Growth OS, or any other business. This is a planning and governance document only.
