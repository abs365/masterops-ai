# Enterprise Design System Foundation

**Part of:** D-001 — Enterprise Experience Foundation
**Scope:** Reusable component and token specification only. No component is implemented by this document.

---

## 1. Starting Point: What Already Exists

MasterOps already has the *ingredients* of a design system, just not assembled into one. Confirmed in the current codebase:

- A consistent card shell repeated ad hoc across components: `bg-white rounded-xl border border-gray-200` (seen in `DashboardCards.tsx`'s configuration warning, `ProjectsTable.tsx`'s empty state, `leads/page.tsx`'s placeholder).
- A consistent table shell repeated ad hoc: `bg-gray-50 text-xs text-gray-500 border-b` header row, `divide-y divide-gray-100` body, `hover:bg-gray-50` row hover — present near-identically in `ProjectsTable.tsx`, and (by the same pattern) `AlertsTable.tsx`, `DeploymentsTable.tsx`, `SecurityEventsTable.tsx`.
- Status colour logic already centralised as data, not yet as a component: `statusColor()`, `statusDot()`, `severityColor()` in `src/lib/utils.ts` map `ProjectStatus`/`AlertSeverity` to Tailwind class strings — but each table inlines its own badge markup consuming these maps rather than sharing one visual component.
- A single existing shared visual primitive: `StatCard` (`src/components/dashboard/StatCard.tsx`), already parameterised by colour (`indigo`/`green`/`red`/`yellow`/`default`).
- Ad hoc, inconsistent empty states: `leads/page.tsx` and `ProjectsTable.tsx` each hand-roll their own "nothing here" block with slightly different copy and spacing.

The design system's job is to name and formalise what is already implicitly agreed upon in the codebase, and fill the small number of genuine gaps (Status Badge, Empty State, Action Panel) — not to invent a new visual language.

## 2. Design Tokens (Formalising What's Already In Use)

No new palette is introduced. This section names the palette already in use so every future component references the same vocabulary:

| Token | Current usage | Meaning |
|---|---|---|
| `surface` | `bg-white` | Card/table background |
| `surface-sunken` | `bg-gray-50` | Table headers, subtle recessed areas |
| `border` | `border-gray-200` | Default card/table border |
| `border-muted` | `border-gray-100` | Divider between table rows |
| `text-primary` | `text-gray-900` | Titles, primary values |
| `text-secondary` | `text-gray-500` | Labels, captions, group headers |
| `text-muted` | `text-gray-400` | Empty-state copy, placeholders |
| `accent` | `indigo-500`/`indigo-600` | Brand mark, active nav state |
| `status-success` | `green-500`/`green-600` | Online, healthy |
| `status-warning` | `yellow-500`/`yellow-600`, `orange-500`/`orange-600` | Slow/degraded, warning severity |
| `status-critical` | `red-500`/`red-600`/`red-700` | Down, critical/emergency severity |
| `status-neutral` | `gray-400`/`gray-500` | Unknown/default state |

## 3. Component: Card

- **Purpose:** the base container for any grouped content — a stat tile, a panel, an empty state, a table wrapper.
- **Spec:** `bg-white rounded-xl border border-gray-200`, `p-8` for centred/empty content, `p-5`/`p-6` for structured content, `overflow-hidden` when it wraps a table.
- **Variants:** default (as above); no elevated/shadow variant — flat bordered cards only, matching the existing restrained visual style.

## 4. Component: Table

- **Purpose:** the single shared shell for every tabular detail section (Portfolio Registry, Enterprise Risk and Alert Centre, Enterprise Release and Deployment Centre, etc.), replacing the currently-duplicated markup in `ProjectsTable`, `AlertsTable`, `DeploymentsTable`, `SecurityEventsTable`.
- **Spec:** Card shell wrapper; header row `bg-gray-50 text-xs text-gray-500 border-b border-gray-200`, left-aligned medium-weight column labels; body rows `divide-y divide-gray-100`, `hover:bg-gray-50` transition.
- **Contract:** takes columns and rows as data; row-level custom rendering (e.g. a project's name + slug stacked, per today's `ProjectsTable`) remains supported via a cell-renderer slot, not hardcoded per table.

## 5. Component: Navigation

- Specified fully in `02_ENTERPRISE_SIDEBAR_DESIGN.md` (Sidebar) and `04_ENTERPRISE_PAGE_LAYOUT_STANDARD.md` §Header. Not restated here; referenced for completeness of the component inventory.

## 6. Component: Status Indicator

- **Purpose:** the single shared visual for any status or severity value, replacing per-table inline badge markup.
- **Spec:** two forms, both driven by the existing `statusColor()`/`statusDot()`/`severityColor()` token maps in `lib/utils.ts` (no new colour logic):
  - **Dot** — a small coloured circle plus label, for compact contexts (table cells, the Header's "System Active" indicator).
  - **Badge** — a coloured pill (background + border + text, per `statusColor()`'s existing three-class pattern) for higher-emphasis contexts (Founder Actions, Risks panels on the Executive Dashboard).
- **Contract:** accepts a `ProjectStatus` or `AlertSeverity` value and renders consistently everywhere that value appears — a "critical" badge looks identical whether it's in the Risks panel or the Enterprise Risk and Alert Centre's detail table.

## 7. Component: Action Panel

- **Purpose:** the page-level actions row defined in the Page Layout Standard (§Actions), and the Founder Actions panel on the Executive Dashboard.
- **Spec:** right-aligned button row for page-level actions (wrapping existing `RunCheckButton`, `GenerateReportButton` styling); for the Founder Actions dashboard panel specifically, a short vertical list (Card shell) of ranked items, each pairing a short label with a single primary action — never more than a handful of items visible without a "view all" link out to the relevant detail page.

## 8. Component: Empty State

- **Purpose:** replace the currently ad hoc, inconsistent "nothing here" blocks (`leads/page.tsx`, `ProjectsTable.tsx`'s no-data case) with one consistent pattern.
- **Spec:** Card shell, centred content, `p-8`, `text-gray-400 text-sm` message — matching today's existing convention — plus two additions not present in either current instance: an icon (via `lucide-react`, matching the section's nav icon) and, where applicable, a single suggested next step (a link or button), so an empty state always explains *why* it's empty and *what would fill it*, not just that it's empty.

## 9. What Is Deliberately Not Specified

- Dark-mode tokens — the current app has no dark-mode toggle; not introduced by this foundation.
- Form input styling — no page in the current inventory has a complex form; specified only if/when one is needed.
- Animation/motion beyond the existing `animate-pulse` status dot — no new motion system introduced.
- Any component's actual code — this is a specification for future, separately-approved implementation.
