# Enterprise Experience Foundation — Implementation Plan

**Part of:** D-001 — Enterprise Experience Foundation
**Status:** Sequencing proposal only. No work described below begins under D-001 — each numbered stage is its own future work package requiring its own explicit Enterprise Programme Director approval.

---

## 1. Gate: D-001 Approval

Nothing in this plan begins until the Enterprise Programme Director has reviewed and approved the full D-001 package: `00_ENTERPRISE_EXPERIENCE_SPECIFICATION.md` through `05_ENTERPRISE_DESIGN_SYSTEM_FOUNDATION.md`, and the accompanying visual reference. Approval of D-001 authorises the design; it does not authorise any implementation described below.

## 2. Sequencing

| Stage | Work | Depends on | Why this order |
|---|---|---|---|
| D-002 | Build the Design System Foundation primitives (Card, Table, Status Indicator, Action Panel, Empty State) as shared components, additive only — no existing page rewired to use them yet | D-001 approved | Nothing else can consistently apply until the shared primitives exist; building them first and separately means they can be reviewed on their own merits before any page depends on them |
| D-003 | Apply the Page Layout Standard and the Stage 1 renames to existing pages, using the D-002 primitives — same routes, same data, same APIs | D-002 complete | Lowest-risk visible change: every page keeps working exactly as it does today, just restructured into Header/Summary/Actions/Detail and relabelled |
| D-004 | Rebuild the Sidebar per the Enterprise Sidebar Design (grouping, anchors, dividers) | D-003 complete (so the labels it groups already match) | Navigation grouping is most legible once the pages it points to already carry their final names |
| D-005 | Rebuild the Executive Dashboard per the Executive Dashboard Design, wiring Founder Actions and Opportunities to placeholder/empty states initially | D-004 complete | The dashboard references every other section by name and depends on the sidebar's grouping story already being live |
| Future, unscoped | Build the actual Enterprise capabilities behind Founder Actions scoring, Opportunity Intelligence data, and any other slot this foundation defines but does not fill | D-005 complete | Explicitly out of scope for the entire D-001 → D-005 sequence — this is where "implement Enterprise capabilities" begins, and it is deliberately kept separate and later |

## 3. What Each Stage Explicitly Does Not Do

- **D-002** does not touch any existing page — it only adds new, unused-until-adopted components.
- **D-003** does not change any route, any data query, or any API — labels and structure only.
- **D-004** does not change what the ten destinations are or where they route to — grouping and visual treatment only.
- **D-005** does not build Founder Actions scoring or real Opportunity data — it wires the dashboard's layout to correctly-designed empty states for those two panels, per `03_EXECUTIVE_DASHBOARD_DESIGN.md` §5.

## 4. Risk Notes Carried Forward From Stage 1

- The "Portfolio Registry" naming collision with `masterops-enterprise-vault`'s `PORTFOLIO_REGISTER.md` (flagged in the Stage 1 Transformation Assessment §6) should be resolved before D-004 ships the grouped sidebar into active founder-facing use, since that is the point at which the name becomes visible day-to-day.
- Every stage preserves the architectural isolation principle (per-project database isolation, read-only/receive-only integration) — none of D-002 through D-005 touches data flow, only presentation.

## 5. Stop Condition

This plan is a proposal for sequencing only. Work does not begin on D-002 or any later stage until it is separately raised, scoped, and approved as its own work package — consistent with the programme's standing rule that each phase requires explicit approval before the next begins.
