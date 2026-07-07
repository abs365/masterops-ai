# Enterprise Sidebar Design

**Part of:** D-001 — Enterprise Experience Foundation
**Implements:** the Enterprise Map defined in `01_ENTERPRISE_NAVIGATION_SPECIFICATION.md`
**Current implementation referenced:** `src/components/layout/Sidebar.tsx` (unchanged by this design; this is a specification for a future, separately-approved implementation)

---

## 1. What "Enterprise-Standard" Means Here

Not a longer list, not a heavier visual style. Three concrete changes distinguish an enterprise-standard sidebar from the current flat one:

1. **Grouping is visible**, so the Enterprise Map (§4 of the Navigation Specification) is legible at a glance, not just true in the abstract.
2. **Visual weight is reserved for what matters** — the current-page indicator and the Overview anchor are the only high-emphasis elements; everything else recedes.
3. **The chrome itself communicates scale-readiness** — a tenth item and a fifteenth item should look equally at home.

## 2. Structure (Top to Bottom)

```
┌────────────────────────────┐
│  [M]  MasterOps            │  ← brand block, unchanged
│       Enterprise Platform  │  ← subtitle updated from "AI Control Centre"
├────────────────────────────┤
│  ● Enterprise Control      │  ← anchor, always first, no group label
│    Centre                  │
├────────────────────────────┤
│  PORTFOLIO & RISK          │  ← group label, small caps, muted
│  ○ Portfolio Registry      │
│  ○ Enterprise Security     │
│    Centre                  │
│  ○ Enterprise Risk and     │
│    Alert Centre            │
├────────────────────────────┤
│  OPERATIONS                │
│  ○ Enterprise Cost         │
│    Intelligence            │
│  ○ Enterprise Continuity   │
│  ○ Enterprise Release and  │
│    Deployment Centre       │
├────────────────────────────┤
│  GROWTH & INTELLIGENCE     │
│  ○ Enterprise Opportunity  │
│    Intelligence            │
│  ○ Executive Intelligence  │
├────────────────────────────┤
│  ○ Enterprise              │  ← anchor, always last, no group label
│    Configuration           │
├────────────────────────────┤
│  Admin: [email]            │  ← footer, unchanged
└────────────────────────────┘
```

This is the same ten destinations as today, in the same dark (`gray-900`) theme — restructured, not lengthened.

## 3. Grouping Treatment

- Group labels are small-caps, muted (`text-gray-500`, matching the existing footer text weight), non-interactive, and never look like a link — they exist purely to teach structure.
- A thin divider (`border-t border-gray-800`, the same tone already used to separate the brand block and footer) separates each group from the next, including the two anchors from their neighbouring groups.
- No accordion, no expand/collapse interaction is introduced in this foundation. Every item stays visible at all times — grouping here is purely visual chunking, not progressive hiding, because hiding items behind a click would work against "reduced cognitive load" by adding interaction cost. Collapsible groups may be reconsidered only once the Enterprise Map grows enough zones to need it (see §5).

## 4. Emphasis and Active State

- The current page keeps a filled active state (today's `bg-indigo-600`), but confined to a left accent bar plus the existing fill — the goal is an executive console feel (a clear "you are here" marker) rather than a bright block.
- The two anchors (Enterprise Control Centre, Enterprise Configuration) carry no extra visual weight beyond their position at the very top and very bottom — position alone, not colour or size, signals their anchor role. This avoids a "three-tier" visual hierarchy that would itself add cognitive load.
- Icons (via `lucide-react`, already the icon library in use) are retained one-per-item for scan-ability, unchanged in style from today.

## 5. Scalability Provision

- A future module is added inside its concept-fit zone (per Navigation Specification §5), not appended below Enterprise Configuration.
- If a zone grows past roughly four to five items, that is the signal to introduce a collapse affordance for that zone specifically — this foundation defines the trigger condition, not the collapse mechanism itself, which is future work once the Enterprise Map actually reaches that scale.
- The sidebar container itself (width, scroll behaviour) is unchanged from today — it already scrolls if content exceeds viewport height, which is sufficient headroom for the near-term Enterprise Map.

## 6. Explicitly Not Covered Here

- A collapsed/icon-only sidebar mode — flagged as a future scalability option in the Stage 1 assessment framing, not designed here since current scale (10 items, 3 groups) does not yet need it.
- Any change to `Header.tsx` — covered by `04_ENTERPRISE_PAGE_LAYOUT_STANDARD.md`.
- Colour tokens and component-level styling rules — see `05_ENTERPRISE_DESIGN_SYSTEM_FOUNDATION.md`.
