# Executive Dashboard Design

**Part of:** D-001 — Enterprise Experience Foundation
**Implements:** the "Where am I" anchor from the Enterprise Map (`01_ENTERPRISE_NAVIGATION_SPECIFICATION.md`)
**Current implementation referenced:** `src/app/(main)/dashboard/page.tsx`, `DashboardCards.tsx`, `RecentAlerts.tsx`, `ProjectStatusTable.tsx` (unchanged by this design)

---

## 1. Required Information Hierarchy

The work package specifies six elements the Executive Dashboard must surface: Enterprise Health, Portfolio Health, Founder Actions, Risks, Opportunities, Executive Summary. Six elements presented with equal weight is itself a wall of data — the design task is ordering them so the page reads top-to-bottom in the same sequence a founder actually thinks, per the business goal's four questions.

## 2. Layout (Top to Bottom)

```
┌──────────────────────────────────────────────────────────────┐
│  EXECUTIVE SUMMARY                                            │
│  "One or two plain-English sentences: state of the enterprise │
│   today." + system status indicator                           │
├──────────────────────────────────────────────────────────────┤
│  ENTERPRISE HEALTH                                             │
│  [ Portfolio ] [ Online ] [ Down ] [ Open Alerts ]             │
│  [ Critical Events ] [ Est. Cost ]     ← aggregate stat row    │
├───────────────────────────────┬────────────────────────────────┤
│  FOUNDER ACTIONS              │  RISKS                         │
│  Ranked, short list of        │  Top-severity alerts/events,   │
│  decisions needing the        │  condensed — detail lives on   │
│  founder, not raw alerts      │  Enterprise Risk and Alert     │
│                                │  Centre                        │
├───────────────────────────────┼────────────────────────────────┤
│  PORTFOLIO HEALTH             │  OPPORTUNITIES                 │
│  Per-project/segment status   │  Enterprise Opportunity        │
│  table (today's project       │  Intelligence preview          │
│  status table, portfolio-     │                                │
│  framed)                      │                                │
└───────────────────────────────┴────────────────────────────────┘
```

## 3. Ordering Rationale

The four rows answer the business goal's questions in order:

1. **Executive Summary** — answers "where am I" in one glance, in plain language, before any numbers. This is the single highest-value addition over today's dashboard, which currently opens directly on stat cards with no narrative framing.
2. **Enterprise Health** — the existing stat-card row (`DashboardCards.tsx`), reframed as an aggregate portfolio-wide read rather than a per-project count — still "where am I," now quantified.
3. **Founder Actions / Risks** — answers "what needs attention" and "what should I do next" together, side by side, because a founder deciding what to do next needs to see the risk that's driving each action alongside it. Founder Actions is deliberately distinct from a raw alert feed: it is a short, ranked, curated list ("2-3 things," not "47 open alerts") — the filtering logic that produces it is a future capability (see `06_IMPLEMENTATION_PLAN.md`), not part of this foundation.
4. **Portfolio Health / Opportunities** — answers "what do I manage" and "what's coming in," placed last because they are inventory and forward-signal, not urgent — a founder consults them, they don't interrupt with them.

## 4. Component Reuse

- The Enterprise Health row reuses the existing `StatCard` component and its colour-coded severity convention (green/yellow/red/default) unchanged — no new stat visual is introduced.
- Portfolio Health reuses the existing `ProjectStatusTable` pattern, laid out through the shared Table primitive defined in `05_ENTERPRISE_DESIGN_SYSTEM_FOUNDATION.md`.
- Founder Actions, Risks, and Opportunities are new panels at the *layout* level only — each is specified as an Action Panel / Card slot (see design system doc) with a defined empty state, since none has a real data source yet beyond Risks (which can render from the existing alerts table immediately, condensed).

## 5. Empty States Are Part of This Design

Because Founder Actions and Opportunities have no data source today, the dashboard must look intentional, not broken, before those capabilities exist. Each panel's empty state (see `05_ENTERPRISE_DESIGN_SYSTEM_FOUNDATION.md` §Empty States) explains what will appear there and why it's currently empty — never a blank box or a raw "no data" string.

## 6. Responsive Behaviour

- Below the `lg` breakpoint, both two-column rows (`Founder Actions/Risks` and `Portfolio Health/Opportunities`) stack to a single column, in this order: Founder Actions, Risks, Portfolio Health, Opportunities — preserving the same top-to-bottom priority as the desktop layout, consistent with the existing `grid-cols-1 lg:grid-cols-2` pattern already used in `dashboard/page.tsx`.
- The Enterprise Health stat row keeps its existing responsive step-down (`grid-cols-2 lg:grid-cols-3 xl:grid-cols-6`) unchanged.

## 7. Explicitly Not Covered Here

- The data source, scoring, or filtering logic behind Founder Actions or Opportunities — that is Enterprise capability, out of D-001's scope.
- Visual component specification (card padding, table style, status colours) — see `05_ENTERPRISE_DESIGN_SYSTEM_FOUNDATION.md`.
- Any change to `dashboard/page.tsx` itself — this is a specification for future, separately-approved implementation.
