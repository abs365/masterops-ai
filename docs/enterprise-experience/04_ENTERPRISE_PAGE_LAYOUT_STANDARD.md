# Enterprise Page Layout Standard

**Part of:** D-001 — Enterprise Experience Foundation
**Applies to:** every non-dashboard page (Portfolio Registry, Enterprise Security Centre, Enterprise Risk and Alert Centre, Enterprise Cost Intelligence, Enterprise Continuity, Enterprise Release and Deployment Centre, Enterprise Opportunity Intelligence, Executive Intelligence, Enterprise Configuration). The Executive Dashboard has its own hierarchy (`03_EXECUTIVE_DASHBOARD_DESIGN.md`) but inherits the same header and spacing rules below.

---

## 1. The Standard Structure

Every page is composed of four regions, always in this order, always optional-but-ordered (a page may omit a region, never reorder one):

```
┌────────────────────────────────────────────────┐
│  HEADER                                         │
│  Page title · one-line purpose · status/context │
├────────────────────────────────────────────────┤
│  SUMMARY                                        │
│  1–3 stat or insight tiles specific to this page│
├────────────────────────────────────────────────┤
│  ACTIONS                                        │
│  Page-level actions bar (e.g. Generate Report,  │
│  Run Check) — right-aligned, low visual weight  │
├────────────────────────────────────────────────┤
│  DETAIL SECTION(S)                              │
│  The bulk of the page: tables, panels, records  │
└────────────────────────────────────────────────┘
```

## 2. Region Definitions

- **Header** — the page title (today rendered by `Header.tsx` from the `titles` map) plus a one-line statement of what this section is for, in founder language. This is new: today's header shows only a title with no framing sentence. Title text follows the Stage 1 renames (e.g. "Enterprise Security Centre," not "Security").
- **Summary** — a small number (1–3) of stat or insight tiles scoped to that page's own domain, using the same `StatCard` primitive as the Executive Dashboard's Enterprise Health row, not a page-specific visual. Existing pages that already show this (e.g. `SecurityStats.tsx`, `CostDashboard.tsx` summary figures) are already aligned with this region and require no redesign, only placement consistency.
- **Actions** — any page-level action (`RunCheckButton`, `GenerateReportButton`, and future equivalents) lives in one consistent, right-aligned actions row directly below Summary, not scattered inside detail tables or floated ad hoc as today.
- **Detail Section(s)** — the existing tables and panels (`AlertsTable`, `ProjectsTable`, `DeploymentsTable`, `SecurityEventsTable`, `BackupsPanel`, etc.) unchanged in data and behaviour, restyled through the shared Table/Card primitives in `05_ENTERPRISE_DESIGN_SYSTEM_FOUNDATION.md`.

## 3. Spacing

Adopt the vertical rhythm already established in `dashboard/page.tsx` (`space-y-6` between regions, `gap-6`/`gap-4` within grids) as the enterprise-wide standard, applied consistently to every page rather than ad hoc per page as today. No new spacing scale is introduced — this standardises the spacing already in use in the strongest existing example.

## 4. Responsive Behaviour

- Summary tiles collapse from their multi-column grid to a single column below the `md` breakpoint, mirroring `StatCard`'s existing responsive steps.
- Actions row wraps to full-width, stacked buttons below `sm` rather than truncating or overflowing.
- Detail tables scroll horizontally within their own container on narrow viewports rather than shrinking column content or breaking page width — consistent with the existing table components' behaviour.

## 5. What This Standardises vs. What Already Exists

Most pages today already informally follow something close to Summary → Actions → Detail (e.g. `security/page.tsx` likely renders `SecurityStats` then `SecurityEventsClient`). This standard's contribution is making that structure explicit and consistent — including adding the missing Header framing sentence everywhere — not inventing a new structure from nothing. Pages that already fit will need the least change; pages that don't (e.g. `leads/page.tsx`, currently a single unstructured placeholder block) will need to be brought into the standard shape when their capability is eventually built.

## 6. Explicitly Not Covered Here

- Component-level visual specification (card borders, table row styling, colour tokens) — see `05_ENTERPRISE_DESIGN_SYSTEM_FOUNDATION.md`.
- Any actual page file change — this is a specification for future, separately-approved implementation.
- The content of any page's Summary or Detail section — unchanged from current functionality per the preservation constraint.
