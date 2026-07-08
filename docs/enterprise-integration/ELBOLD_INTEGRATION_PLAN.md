# ELBOLD Enterprise Integration Plan

**Programme:** MasterOps Enterprise Integration
**Project:** ELBOLD Enterprise Integration
**Phase:** Integration Planning
**Status:** Planning only — no implementation in this package

This document is a template: the intent is that the next business onboarded to MasterOps follows the same eight sections, matrix shape, and sequencing logic, with its own facts substituted in.

---

## 1. Executive Summary

ELBOLD is already present in MasterOps as an Enterprise Registry entry (D-006) and a Portfolio Workspace card (D-004) — but it is not yet *connected*. Today ELBOLD shows "Not Connected" because no row exists for it in masterops-ai's `projects` table; every MasterOps capability that depends on live data (Platform Health, Deployment Summary, Alerts, Founder Action Queue) currently has nothing to read for ELBOLD.

This plan defines what should flow from ELBOLD into MasterOps, what must never leave ELBOLD, and in what order the connection should be built. The central design constraint, carried over from ELBOLD's own documented architecture, is that **MasterOps receives ELBOLD's operational/technical signals only — never customer PII, never vendor financial data, never commercial metrics**. Commercial and growth data (MRR, vendor funnel, bookings) has a separate, already-designed destination: Master Growth OS's Reporting API (architected, not yet built). MasterOps and Master Growth OS are not the same consumer and should not receive the same data for the same reason — this is addressed directly in §10.

No code, schema, or configuration changes are made by this package. It is the basis for a future, separately-approved Implementation phase.

## 2. Systems in Scope

Three separate systems are involved, each with its own database and its own deployment:

| System | Repository | Role |
|---|---|---|
| **ELBOLD** | `bold-party-planner` | The business being integrated — event marketplace, Vendor OS, Customer Event OS |
| **MasterOps** | `masterops-ai` | The Enterprise platform this plan integrates ELBOLD *into* — Operations Centre, Enterprise Registry, Shared Services (D-001–D-007) |
| **Master Growth OS** | `master-growth-os` | ELBOLD's existing growth/commercial intelligence platform — a separate, already-architected integration target for commercial data, referenced but not modified here |

## 3. Enterprise Capabilities Owned by MasterOps

Per D-001 through D-007, already live and generic (built for any registered business, not ELBOLD-specific):

- **Enterprise Registry** (D-006) — business identity: name, stage, owner, contacts, URLs, category. ELBOLD already has an entry.
- **Portfolio Workspace** (D-004) — card view combining Enterprise Registry data with live `projects` connectivity.
- **Operations Centre** (D-005) — Platform Health, Deployment Summary, Integration Status, Alerts Centre, Founder Action Queue, Cost Summary, Backup Summary — all computed from the shared `projects`, `alerts`, `api_usage_logs` tables plus live Vercel/GitHub API calls.
- **Enterprise Reporting** (Shared Service, D-007) — daily operational summaries, template or AI-generated.
- **Enterprise Notifications** (Shared Service, D-007) — Telegram + email dispatch for critical/emergency signals.
- **Shared Services Catalogue** (D-007) — the discovery surface for all of the above, plus four not-yet-built services (Audit, Documents, Search, Identity).

## 4. Business Capabilities Owned by ELBOLD

Verified directly against `bold-party-planner` for this plan (not assumed from memory):

- Vendor marketplace: application, approval, governance engine (`lib/vendor/governance.ts`), lifecycle states
- Customer booking flow, Stripe payments (live), Stripe Connect (built, kill-switched off)
- Financial ledger, commission split, payouts
- Vendor CRM (manual contacts, follow-ups, customer timeline)
- Vendor Business Control Centre (health scoring, revenue panels)
- Admin governance log (`governance_decisions`, immutable, migration 060) and role-based admin access (`admin_roles`)
- Its own notification stack (Resend daily summary email, in-app notifications)
- Its own monitoring: none confirmed pushing to any external Enterprise system today

ELBOLD's own audit trail (`governance_decisions`) is more mature than MasterOps' current Enterprise Audit (Foundation Only, per D-007) — worth noting as a design input for MasterOps' own future Audit service, not as data that should flow anywhere.

## 5. Information Flowing from ELBOLD into MasterOps

Deliberately narrow — operational and technical signals only:

1. **Uptime / response time** — MasterOps already polls any registered project's public URL (`/api/monitor/check-projects`). No push from ELBOLD required; MasterOps pulls a public HTTPS endpoint.
2. **Deployment state** — MasterOps' existing Vercel/GitHub pull (`src/lib/deployment-status.ts`, D-005) can read ELBOLD's Vercel project (`prj_xyh9hEHhk9emVMLurA7FZJmuYbIV`, confirmed in `bold-party-planner/.vercel/project.json`) and GitHub repo (`abs365/bold-party-planner`, confirmed via git remote) once both are set on ELBOLD's `projects` row. Pull-based; no ELBOLD code change.
3. **Infrastructure cost/usage** *(future, not immediate)* — would require ELBOLD to push to MasterOps' existing `/api/costs/log-usage` endpoint. No such push exists in ELBOLD today (confirmed: no code in `bold-party-planner` posts to any external cost-ingest endpoint).
4. **Operational alerts** *(future, not immediate)* — would require ELBOLD to push to MasterOps' `/api/security/log-event` or `/api/alerts/create`. No such push exists in ELBOLD today.

Nothing above requires ELBOLD to expose customer, vendor, or financial data — only infrastructure identifiers (URL, repo, Vercel project ID) that ELBOLD's own `.vercel/project.json` and `next.config.ts` already show are not secret.

## 6. Information Remaining Inside ELBOLD

Everything else — explicitly, per ELBOLD's own documented production constraints:

- All customer PII, vendor PII
- `financial_ledger`, `financial_events`, Stripe Connect account data, commission/payout figures
- Bookings, quotes, reviews, messages
- `governance_decisions` (ELBOLD's own admin audit log) — stays ELBOLD's own record, not exported
- MRR, vendor funnel/acquisition metrics, subscription data — these belong to Master Growth OS's Reporting API track (§10), not to MasterOps

This mirrors the existing, Founder-confirmed rule for ELBOLD ↔ Master Growth OS ("separate product, separate DB, separate auth... no customer PII or vendor financial data may flow to it") — flagged here as an **assumption**, not a confirmed rule, since the Founder has not yet stated this specific boundary for MasterOps (see §15).

## 7. Operational Health Signals

Once ELBOLD has a `projects` row, every Operations Centre panel built in D-005 works for it automatically — nothing ELBOLD-specific needs to be built on the MasterOps side:

- **Platform Health** — Overall status/Production health/Environment health/System availability, derived from `projects.status` (populated by the existing monitor cron)
- **Deployment Summary** — latest deployment state per project, once `vercel_project_id` is set
- **Alerts Centre** — any alert MasterOps' own monitor creates for ELBOLD (e.g. "ELBOLD is DOWN") appears here, categorised Critical/Warning/Information
- **Integration Status** — unaffected by ELBOLD (this panel describes MasterOps' own integrations, not per-business ones)

## 8. Founder Actions Generated by ELBOLD

Also automatic once connected, via the existing `getFounderActionQueue()` (D-005/D-006):

- "ELBOLD is down" — if `projects.status = 'down'`
- "N failed deployments" — if ELBOLD's latest Vercel deployment state is `ERROR`, with the registered Business Owner appended from the Enterprise Registry (D-006 pattern) once one is on file
- Critical alert count — if MasterOps' monitor raises a critical/emergency alert for ELBOLD

No new Founder Action Queue logic needs to be written for ELBOLD specifically — this is the intended reuse outcome of D-005/D-006 already being generic.

## 9. Shared Services Consumed

Mapped against the D-007 catalogue:

| Service | Readiness | ELBOLD today |
|---|---|---|
| Enterprise Metadata Services | Implemented | **Already consuming** — ELBOLD is one of the 6 Enterprise Registry entries |
| Enterprise Reporting | Implemented (MasterOps-only) | Not yet — becomes possible once ELBOLD has live `projects` data to summarise |
| Enterprise Notifications | Implemented (MasterOps-only) | Not needed — ELBOLD has its own Resend-based notification stack already |
| Integration Registry | Partially Implemented | Not yet — would need ELBOLD's own integrations (Stripe, Resend, Supabase) catalogued once this service is formalised |
| Enterprise Audit | Foundation Only | Not applicable yet — ELBOLD's own `governance_decisions` is more mature than this MasterOps service today |
| Enterprise Identity | Foundation Only | Not applicable — ELBOLD has its own real auth (`@supabase/ssr`, `admin_roles`); more mature than MasterOps' current (none) |
| Enterprise Documents | Not Started | Not applicable |
| Enterprise Search | Not Started | Not applicable |

## 10. Future Master Growth OS Interactions

Two separate, non-overlapping tracks — this plan does not merge them:

1. **ELBOLD → Master Growth OS** (commercial/growth intelligence): already architected in `bold-party-planner/MASTER_GROWTH_REPORTING_API_ARCHITECTURE.md` (Priority 5, designed 2026-07-02, not yet built). Generic 6-stage funnel vocabulary, per-product API keys, aggregate-only responses. This remains the correct channel for MRR, vendor funnel, and subscription data — **not** MasterOps.
2. **Master Growth OS → MasterOps** (this plan's own layer): Master Growth OS is itself one of the 6 Enterprise Registry businesses and can be connected to MasterOps' Operations Centre the same way ELBOLD is — as an operational/technical signal source (uptime, deployments), independent of the commercial data it separately receives from ELBOLD.

The net shape: MasterOps sees the *operational health* of every business, including Master Growth OS itself. Master Growth OS sees the *commercial performance* of every business that reports to it, starting with ELBOLD. Neither layer duplicates the other's data.

## 11. Enterprise Integration Diagram

```
┌─────────────────────────┐        pull: uptime, deployment state        ┌──────────────────────────┐
│   ELBOLD                │ ───────────────────────────────────────────▶ │   MasterOps               │
│   (bold-party-planner)  │        push (future): cost, alerts           │   (masterops-ai)           │
│                          │ ───────────────────────────────────────────▶ │                            │
│  • Marketplace / Vendor  │                                              │  • Enterprise Registry (D-006)
│    OS / Customer Event OS│        NEVER: PII, financial ledger,        │  • Portfolio Workspace (D-004)
│  • Stripe payments       │        bookings, commercial metrics         │  • Operations Centre (D-005)
│  • governance_decisions  │ ──────────────────╳ blocked ╳─────────────▶ │  • Shared Services (D-007)
│    (own audit log)       │                                              │                            │
└─────────────────────────┘                                              └──────────────────────────┘
            │
            │ aggregate commercial/funnel data only
            │ (architected, not yet built — separate API,
            │  separate track from the MasterOps integration above)
            ▼
┌─────────────────────────┐
│   Master Growth OS       │  ◀── also an Enterprise Registry entry in MasterOps,
│   (master-growth-os)     │       connected the same operational way ELBOLD is (§10.2)
│  • Growth intelligence   │
│  • Funnel/MRR reporting  │
└─────────────────────────┘
```

## 12. Integration Matrix

| Capability | System Owner | Source | Destination | Synchronisation Method | Future Automation Opportunity |
|---|---|---|---|---|---|
| Enterprise Profile (name, stage, owner, contacts) | MasterOps | Founder (manual) | `enterprise-registry.ts` (masterops-ai) | Manual config edit | None planned — intentionally hand-maintained (D-006) |
| Platform Uptime | MasterOps | ELBOLD production URL (public HTTPS) | `projects.status` (masterops-ai) | Pull — existing `/api/monitor/check-projects` cron | Already fully automated once the `projects` row exists |
| Deployment State | MasterOps | Vercel API, ELBOLD project `prj_xyh9hEHhk9emVMLurA7FZJmuYbIV` | Operations Centre Deployment Summary | Pull — existing `getVercelData()` | Already fully automated once `vercel_project_id` is set |
| CI / Build Status | MasterOps | GitHub API, `abs365/bold-party-planner` | Operations Centre Deployment Summary | Pull — existing `getGitHubData()` | Already fully automated once `github_repo` is set |
| Infrastructure Cost | ELBOLD | ELBOLD's own third-party API usage (if instrumented) | `api_usage_logs` (masterops-ai) | Push — existing `/api/costs/log-usage` | ELBOLD-side instrumentation does not exist yet — future build |
| Operational Alerts | ELBOLD | ELBOLD's own error/monitoring layer (if built) | `alerts` / `security_events` (masterops-ai) | Push — existing `/api/alerts/create` or `/api/security/log-event` | ELBOLD-side alerting does not push anywhere externally today — future build |
| Founder Action Items | MasterOps | Derived from the three rows above + Enterprise Registry | Operations Centre Founder Action Queue | Computed live, no sync needed | Already fully automated (D-005/D-006) |
| Commercial / Funnel Data | Master Growth OS (not MasterOps) | ELBOLD `financial_ledger`, subscription events | Master Growth OS Reporting API | Future REST API, per-product key | Architected (`MASTER_GROWTH_REPORTING_API_ARCHITECTURE.md`), not built |
| Enterprise Audit Log | Neither (ELBOLD keeps its own) | ELBOLD `governance_decisions` | Stays inside ELBOLD | Not synchronised | Could inform MasterOps' future Enterprise Audit design (D-007), not a data flow |

## 13. Recommended Implementation Sequence

Numbered for reference only — each step is its own future work package requiring separate approval, per the programme's standing rule.

1. **Register ELBOLD as a `projects` row in masterops-ai** — name, slug, production URL, `vercel_project_id`, `github_repo`. No ELBOLD code change; a MasterOps-side data entry only. Unlocks Platform Health, Deployment Summary, and Founder Action Queue immediately (all already generic).
2. **Confirm the monitor cron and Vercel/GitHub tokens are live** for the new row (operational verification, not new code).
3. **Populate ELBOLD's Enterprise Registry entry** (D-006) with real Business Owner, Primary Contact, Production URL, Git Repository — currently all `null`.
4. **Decide whether ELBOLD needs cost/alert push integration** (Integration Matrix rows 5–6) — only worth building once there's a concrete need (e.g. ELBOLD adopts paid third-party APIs worth tracking centrally).
5. **Revisit Master Growth OS Reporting API** (§10.1) as its own separate, already-scoped track — not blocked by, or blocking, steps 1–4.

## 14. Risks

- **Boundary drift** — the biggest risk is MasterOps' Operations Centre or Enterprise Reporting quietly growing to include commercial metrics "since they're right there," recreating the exact cross-product analytics duplication the Founder already rejected once (§10). Mitigation: this plan's explicit §5/§6 split, referenced by name in any future implementation package.
- **Token scope** — using a single `VERCEL_TOKEN`/`GITHUB_TOKEN` (as MasterOps already does for other projects) to read ELBOLD's deployment/CI data means that token must have at least read access to ELBOLD's Vercel team and GitHub repo. Confirming that access is safe and appropriately scoped is an implementation-phase task, not assumed here.
- **False "Not Connected" signal today** — until step 1 (§13) happens, ELBOLD will continue showing as unconnected everywhere in MasterOps, which is accurate but could be mistaken for a fault rather than an unstarted integration.
- **No ELBOLD-side push infrastructure exists** — rows 5–6 of the Integration Matrix are aspirational; there is no cost or alert instrumentation in `bold-party-planner` today to connect. Treat step 4 as genuinely optional, not assumed-necessary.

## 15. Assumptions

- The "separate DB, separate auth, no PII/financial data" rule documented for ELBOLD ↔ Master Growth OS is assumed to extend to ELBOLD ↔ MasterOps by the same logic, but this has **not** been explicitly confirmed by the Founder for MasterOps specifically — flagged here rather than silently treated as settled.
- ELBOLD's production URL was not independently re-confirmed as a live string in this plan (only its Vercel project ID and GitHub repo were verified); the exact URL should be confirmed by the Founder when step 1 (§13) is scoped.
- "Master Growth owns intelligence, products own execution" (the governing principle behind §10) is taken from existing Master Growth OS memory/documentation, not re-confirmed with the Founder in this session — worth a quick sanity check before implementation begins, since it directly shapes what MasterOps is and isn't allowed to receive.
- No assumption is made about timeline — this plan defines sequence, not dates.

## 16. Future Roadmap

- Extend this same eight-section planning structure to the next business onboarded (MeritBold is the most likely next candidate, per existing portfolio memory).
- Once two or more businesses are connected, revisit Enterprise Reporting (D-007) to synthesise across them — explicitly deferred in that service's own roadmap until a second business has live data.
- Once Integration Registry (D-007) is formalised beyond MasterOps' own integrations, extend it to catalogue each business's integrations too (Stripe for ELBOLD, etc.) — read-only documentation, never credentials.
- Revisit Enterprise Identity (D-007, Foundation Only) once more than one business needs a federated view — ELBOLD's own real auth implementation is a useful reference point when that work begins.

---

**Stop condition honoured:** no integration has been implemented. This is a planning document only.
