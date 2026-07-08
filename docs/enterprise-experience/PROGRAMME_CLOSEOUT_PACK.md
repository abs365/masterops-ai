# Enterprise Experience Programme — Close-out Pack (Pre-D-006 Baseline)

**Prepared:** 2026-07-08, before any D-006 work begins
**Scope:** documentation only — no code, routing, schema, or production change in this package
**Purpose:** establish the official baseline of everything delivered under D-001 through D-005 before the next work package opens

---

## 1. Enterprise Delivery Register

| Package | Status | Commit(s) | Production Status | Evidence Status | Assurance Status | Baseline Status |
|---|---|---|---|---|---|---|
| D-001 — Enterprise Experience Foundation | Approved | `bd3a6f1` (docs only — spec + design system, no code) | N/A — specification package, nothing deployed | Present — `00_ENTERPRISE_EXPERIENCE_SPECIFICATION.md` through `05_ENTERPRISE_DESIGN_SYSTEM_FOUNDATION.md` + `06_IMPLEMENTATION_PLAN.md` | Not visible to Claude — no Codex report has been shared in this thread | Established — authorised the design that D-002 through D-005 implement |
| D-002 — Enterprise Experience Implementation | Approved | `b449cd0` | Deployed & verified live (`/dashboard`, `/security` spot-checked at the time) | Present — `D-002_EVIDENCE_PACKAGE.md` | Not visible to Claude | Established — sidebar grouping + 5 design-system primitives (Card, StatusBadge, EmptyState, Table, ActionPanel) still in active use by every later package |
| D-002A — Navigation Refinement | Approved for production | `ee1f9b7`, `8f7704d` | Deployed & verified live | Present — `D-002A_EVIDENCE_PACKAGE.md` | Not visible to Claude | Established — current sidebar label set (Control Centre, Portfolio, Security Centre, Risk & Alerts, Cost Intelligence, Continuity, Release & Deployments, Opportunity Intelligence, Executive Intelligence, Configuration) |
| D-003 — Executive Intelligence Dashboard | Approved | `de42e91` | Deployed & verified live | Present — `D-003_EVIDENCE_PACKAGE.md` | Not visible to Claude | Established — current `/dashboard` structure (Executive Summary, Founder Action Centre, Risk Overview, Portfolio Health, Opportunity Intelligence) |
| D-004 / D-004A — Portfolio Workspace | Approved | `8d88891` (D-004), `0dfecee` (D-004A refinement) | Deployed & verified live | Present — `D-004_EVIDENCE_PACKAGE.md` | Not visible to Claude | Established — current `/projects` structure (Portfolio Summary + 6 Enterprise Cards, Business Stage independent of MasterOps Status) |
| D-005 — Enterprise Operations Centre | Approved (incl. mid-package Architectural Clarification for the new `/operations` route) | `237fe8c` (implementation), `a06c9ac` (evidence) | Deployed & verified live — confirmed `X-Matched-Path: /operations`, `X-Vercel-Cache: MISS` on production | Present — `D-005_EVIDENCE_PACKAGE.md` | **Explicitly pending** — Founder confirmed Codex assurance is in progress on D-005 as of this pack; not yet reported back in this thread | Newly established — pending Codex assurance sign-off before treated as fully closed |

**Note on Assurance Status:** Claude has no direct visibility into Codex's review process or outputs. Every row above marked "Not visible to Claude" reflects that honestly rather than assuming approval — the Founder's own workflow keeps Claude (Implementation) and Codex (Assurance) separate, and no assurance report has been shared into this conversation for any package, D-005 included.

---

## 2. Wave Summary

### Wave 1 (D-001 → D-004A): Foundation, Dashboard, Navigation, Portfolio

**Objectives achieved:**
- Replaced a flat, ad hoc UI with a consistent Enterprise design system (5 reusable primitives) applied across the Dashboard and Portfolio pages.
- Replaced a flat 10-link sidebar with a grouped Enterprise Map (1 anchor → 3 named zones → 1 anchor), then refined its labels twice for legibility (D-002A).
- Turned `/dashboard` into an executive command centre (KPI tiles, Founder Action Centre, Risk Overview, Portfolio Health, Opportunity Intelligence placeholder).
- Turned `/projects` into a named, six-business Portfolio Workspace with an honest empty state for every business not yet connected, and Business Stage separated from live MasterOps connectivity status.

**Key improvements:**
- Every empty state now explains *why* it's empty instead of showing a bare "no data" line or, worse, a plausible-looking fabricated number.
- Design system primitives (`Card`, `StatusBadge`/`SeverityBadge`, `EmptyState`, `Table`, `ActionPanel`) mean every subsequent package (D-003 onward) builds on shared components instead of re-inventing markup.
- Two concepts that were previously conflated — Business Stage vs. MasterOps connectivity status — were explicitly separated (D-004A), a direct result of the Founder catching an ambiguous first pass before it shipped.

**Lessons learned:**
- Removing an ad hoc "Deployment Issues" / "Failed Jobs" style block is preferable to fabricating numbers for it — RiskOverview's "Not tracked here" pattern (D-003) became the template every later package (including D-005's Integration Status) reused.
- Sidebar label length matters operationally, not just cosmetically — D-002's original labels caused two items to fall below the fold in production, only caught and fixed in D-002A after a live screenshot comparison.
- Every package benefits from an explicit "what this stage does NOT do" section (per `06_IMPLEMENTATION_PLAN.md` §3) — it's what made each stage reviewable on its own, rather than as part of an ever-expanding change.

### Wave 2, Milestone 1 (D-005): Operations Centre

**Completed:** D-005 Enterprise Operations Centre, at the new `/operations` route — Platform Health, Founder Action Queue, Deployment Summary, Integration Status, Alerts Centre, Cost Summary, and Backup Summary, all sourced from data that already existed elsewhere in the app (see `D-005_EVIDENCE_PACKAGE.md` §3 for the full source mapping).

**Current platform capability, as of this baseline:**
- Ten founder-facing pages, one shared design system, one grouped Enterprise Map sidebar.
- Two executive-level landing pages exist side by side: `/dashboard` (portfolio-wide executive summary) and `/operations` (operational health specifically) — each answers a different question, neither duplicates the other's data source beyond genuinely shared signals (`getDashboardStats()`).
- Honest gaps are now visible rather than hidden: Authentication, Payments, and Storage are explicitly marked "Not Integrated" on the new Operations Centre, and every optional integration missing its environment variable (Vercel, GitHub, Resend, Supabase Management API, CRON_SECRET) surfaces as a concrete Founder Action Queue item.

**Remaining roadmap (unscoped, not started):**
- The original `06_IMPLEMENTATION_PLAN.md` sequencing anticipated D-005 would rebuild the Executive Dashboard; that was superseded by the Founder's Operations Centre redirect. Whether an Executive Dashboard rebuild is still wanted, and where it falls in the sequence, is an open question for whoever scopes the next package.
- No Enterprise capability behind any placeholder has been built yet: Founder Actions scoring, Opportunity Intelligence data, real Authentication, Payments, or Storage integrations. This was explicitly deferred by `06_IMPLEMENTATION_PLAN.md` §2 ("Future, unscoped") and remains deferred.
- D-005's own Integration Status and Founder Action Queue panels are themselves candidates for future real data (e.g. an actual auth provider) once the Founder decides to build one — nothing in D-005 assumes or blocks that decision either way.

---

## 3. Route Inventory (confirmed against `npm run build`, 2026-07-08)

| Enterprise Name | Route | Sidebar Group | Header Title |
|---|---|---|---|
| Control Centre (Dashboard) | `/dashboard` | Anchor (top) | Enterprise Control Centre |
| Portfolio | `/projects` | Portfolio & Risk | Portfolio Workspace |
| Security Centre | `/security` | Portfolio & Risk | Enterprise Security Centre |
| Risk & Alerts | `/alerts` | Portfolio & Risk | Enterprise Risk and Alert Centre |
| **Operations Centre** (new, D-005) | `/operations` | Operations | Enterprise Operations Centre |
| Cost Intelligence | `/costs` | Operations | Enterprise Cost Intelligence |
| Continuity | `/backups` | Operations | Enterprise Continuity |
| Release & Deployments | `/deployments` | Operations | Enterprise Release and Deployment Centre |
| Opportunity Intelligence | `/leads` | Growth & Intelligence | Enterprise Opportunity Intelligence |
| Executive Intelligence | `/reports` | Growth & Intelligence | Executive Intelligence |
| Configuration | `/settings` | Anchor (bottom) | Enterprise Configuration |

**10 founder-facing routes total**, matching the Enterprise Map defined in `01_ENTERPRISE_NAVIGATION_SPECIFICATION.md` plus the one addition approved under D-005. All ten confirmed present and building cleanly via `npm run build` (Next.js route listing, 2026-07-08) — no route added or removed beyond the approved `/operations` addition. API routes (`/api/*`) are unchanged and out of scope for this founder-facing inventory.

---

**This pack is documentation only.** No file under `src/` was touched to produce it; no deployment was triggered. It reflects the state already live in production as of commit `a06c9ac`.

**Stop condition honoured:** D-006 has not been started.
