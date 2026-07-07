# D-004 Evidence Package — Portfolio Workspace

**Work Package:** D-004, approved, refined under D-004A, both live in production
**Builds on:** D-001 foundation, D-002 implementation, D-002A refinement, D-003 dashboard
**Scope:** the Portfolio page (`/projects`) only — no routing, schema, integration, or business logic change

---

## 1. Executive Summary

The Portfolio page went from a flat, empty-looking technical table ("No projects found. Run the Supabase migration to seed your projects.") to an Enterprise Portfolio Workspace: a 4-tile summary (Total / Active / Planning / Requiring Attention) followed by a card grid covering the Founder's declared six-business roster (ELBOLD, Master Growth OS, Football Intelligence Group, ChurchOS, FamilyOS, MeritBold). No metric was invented for any business without real backing data — every card without a matching `projects` row honestly shows "Not Connected" / "Not yet connected to MasterOps — no live data available" / a disabled "Not Yet Linked" action, rather than a plausible-looking fake number.

## 2. A Judgment Call Raised at D-004, Resolved at D-004A

D-004 named six real businesses to include, several of which (Master Growth OS, MeritBold) are entire separate products in the portfolio, and asked for a "Current stage" — but no such field exists in the `projects` schema. D-004 shipped with Stage *derived* from MasterOps connectivity (no match → "Planning," matched+healthy → "Active," matched+degraded → "Attention"), flagged at the time as the one thing to revisit if that wasn't the right reading of "Do not invent metrics."

**D-004A resolved this directly**, per the Programme Director's explicit instruction to separate the two concepts:

- **Business Stage** (Concept/Building/Pilot/Live/Growing/Scaling) is now sourced from a new, manually maintained configuration (`src/lib/enterprise-stage-config.ts`) — never derived from connectivity. Left as **"Unspecified"** ("Not set" in the UI) for all six businesses, since no real stage was confirmed — the config exists to be edited directly, or wired to real Enterprise metadata later.
- **MasterOps Status** (Connected/Partially Connected/Not Connected) now carries the connectivity read alone, independent of Business Stage.
- Portfolio Summary's four tiles (Total/Active/Planning/Requiring Attention) kept their original connectivity+health derivation — renamed internally to `OperationalBucket` to avoid conflating with the new Business Stage concept, visible labels unchanged.

The six roster names themselves remain a static, code-level list (`src/lib/enterprise-roster.ts`) — content, not a database change, analogous to the Sidebar's static nav labels.

## 3. Before / After

Captured live via the same stash/restore technique as D-002/D-002A/D-003.

| | Before | After |
|---|---|---|
| Page heading | "All Projects" / "Monitor health and status of every platform" | "Portfolio Workspace" / "Every business in the Enterprise, in one place" |
| Header title | "Portfolio Registry" | "Portfolio Workspace" |
| Content (0 registered projects) | Single empty-state line, no portfolio identity at all | 4-tile summary (6 Total / 0 Active / 6 Planning / 0 Attention) + 6 named Enterprise Cards, each with stage badge, connection status, honest empty copy, and a disabled "Not Yet Linked" action |
| Content (if a business were registered) | Flat table row: name, status, response, last checked, URL link | Card for that business: real `StatusBadge`, real last-activity time, and an "Open Workspace" button linking to its real `url` |
| Fixed bug found during verification | — | The "Not Connected" badge initially wrapped onto two lines on longer names (e.g. "Football Intelligence Group"), breaking card alignment — fixed with `whitespace-nowrap`/`shrink-0` before commit |
| D-004A: card fields | Single collapsed "stage" badge (Active/Attention/Planning) tied to connectivity | Two independent, separately labelled fields: **Business Stage** ("Not set") and **MasterOps Status** ("Not Connected") — shown side by side under the business name |
| D-004A: card title | Shared a row with the connectivity badge; wrapped/crowded on long names | Full-width on its own line above the two-field grid — "Football Intelligence Group" no longer truncates |

## 4. Files Changed

**D-004 — commit `8d88891`** — 8 files changed, 196 insertions(+), 71 deletions(-):

- Removed: `src/components/projects/ProjectsTable.tsx` — fully superseded by the new card view over the same query.
- Added: `src/lib/enterprise-roster.ts`, `src/lib/portfolio-workspace.ts`, `src/components/projects/EnterpriseCard.tsx`, `src/components/projects/PortfolioSummary.tsx`
- Modified: `src/app/(main)/projects/page.tsx`, `src/components/layout/Header.tsx` (`/projects` title → "Portfolio Workspace")

**D-004A — commit `0dfecee`** — 3 files changed, 96 insertions(+), 34 deletions(-):

- Added: `src/lib/enterprise-stage-config.ts` — the manually maintained Business Stage config
- Modified: `src/lib/portfolio-workspace.ts` — adds `MasterOpsStatus`/`OperationalBucket`, reads `businessStageFor()` per card
- Modified: `src/components/projects/EnterpriseCard.tsx` — renders Business Stage and MasterOps Status as two independent fields

## 5. Commit Hashes

- `8d88891` — `feat: implement D-004 Portfolio Workspace`
- `0dfecee` — `refine(D-004A): separate Business Stage from MasterOps Status`

Both on branch `main`, pushed to `origin/main` (`de42e91..0dfecee`).

## 6. Production Deployment Verification

**Deployed and confirmed.** Verified:

- **URL:** https://masterops-ai.vercel.app/projects
- Response headers: `X-Vercel-Cache: MISS`, `Age: 0` — fresh dynamic render, not cached.
- In-browser: Portfolio Workspace live, all 6 Enterprise Cards render correctly, Business Stage ("Not set") and MasterOps Status ("Not Connected") display as two independent, separately labelled fields per card, matching local verification exactly.
- No routing regressions — spot-checked `/security`, unaffected, header/sidebar correct.
- No visual regressions observed anywhere in the sidebar, header, or other pages.

## 7. Confirmation: No Business Logic Changed

- **Query** — `getPortfolioWorkspace()` runs the exact same `supabase.from('projects').select('*').order('name')` query `ProjectsTable.tsx` used; no new table, column, or filter added to the data layer.
- **Schema** — untouched. The roster and the Business Stage config are TypeScript constants, not migrations; MasterOps Status is computed at render time from the existing `status`/`url`/`last_checked_at` fields, not stored anywhere.
- **Routing** — `/projects` unchanged; verified via `npm run build`'s route listing (all 10 routes identical) before commit.
- **Integrations/APIs** — `RunCheckButton`'s call to `/api/monitor/check-projects` is untouched and still present on the page.
- **Master Growth OS** — not touched; only its *name* appears as one of six roster entries on this page, which is display content about the portfolio, not a change to that repository or its code.
- **Invented data** — none. Every business without a registered row shows honest "not connected" language, not a fabricated stage, health number, or URL.

---

**Stop condition honoured:** D-005 has not been started.
