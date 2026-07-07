# MasterOps Enterprise Experience Specification

**Work Package:** D-001 — Enterprise Experience Foundation
**Status:** Design package approved. Implemented under D-002 and refined under D-002A (see §8) — both live in production.
**Subject:** `masterops-ai` UX/experience layer only. No business logic, database, integration, or routing change is proposed or implied.
**Explicitly out of scope:** Master Growth OS (not touched, not redesigned, not referenced as a dependency).

This document is the index and synthesis of the D-001 package. It does not duplicate the detail in the five companion specifications — it states the objective, the constraints every companion spec must honour, and the success criteria the whole package is judged against.

---

## 1. Objective

Establish the Enterprise Experience Foundation: the navigation model, dashboard hierarchy, page layout standard, and design system primitives that every current and future MasterOps screen inherits. This foundation is what makes MasterOps *feel* like an enterprise-grade, founder-first platform — it does not, by itself, add any Enterprise capability.

## 2. Business Goal

A first-time founder opening MasterOps should immediately be able to answer four questions without training or a walkthrough:

1. **Where am I?** — the current section's place in the enterprise, not just a page title.
2. **What does MasterOps manage?** — the shape of the portfolio, visible at a glance.
3. **What requires attention?** — risk and action surfaced, not buried in logs.
4. **What should I do next?** — a small number of concrete, ranked actions, not a wall of data.

The platform must feel simple despite enterprise-grade capability underneath it. Simplicity here means *fewer things to parse per screen*, not *fewer capabilities* — depth is still available, just not all surfaced at once.

## 3. Package Contents

| Document | Answers |
|---|---|
| `01_ENTERPRISE_NAVIGATION_SPECIFICATION.md` | How should navigation teach the enterprise, not just list pages? |
| `02_ENTERPRISE_SIDEBAR_DESIGN.md` | How does the existing sidebar become enterprise-standard without just growing longer? |
| `03_EXECUTIVE_DASHBOARD_DESIGN.md` | What is the information hierarchy of the landing screen? |
| `04_ENTERPRISE_PAGE_LAYOUT_STANDARD.md` | What does every other page inherit? |
| `05_ENTERPRISE_DESIGN_SYSTEM_FOUNDATION.md` | What are the reusable building blocks? |
| `06_IMPLEMENTATION_PLAN.md` | In what order does this get built, once approved? |

## 4. Constraints Every Companion Spec Must Honour

These are restated here once so each companion document doesn't need to repeat them:

- **Do not rebuild MasterOps.** The existing route structure (`(main)/dashboard`, `/security`, etc.), Supabase schema, and ingestion APIs are untouched by this package.
- **Do not change business logic, databases, or integrations.** This is a presentation-layer proposal only.
- **Do not change routing.** Renames (per the Stage 1 Transformation Assessment) are a labelling concern; this package assumes the same ten routes exist.
- **Do not redesign Master Growth OS.** Out of scope entirely.
- **Do not implement Enterprise capabilities.** Where a design calls for data that doesn't exist yet (e.g. a Founder Actions feed, real Opportunity Intelligence data), the design specifies the *slot* and its *fallback empty state* — it does not build the capability that would fill it. That is future, separately-approved work (see `06_IMPLEMENTATION_PLAN.md`).
- **Preserve existing functionality.** Every current page's real data (stat cards, tables, AI reports, env health) continues to render; this package changes structure and hierarchy around it, not the data itself.
- **Build on the existing stack, not a new one.** Next.js App Router, Tailwind CSS, `lucide-react` icons, the existing gray/indigo palette and `space-y-6` / `grid-cols-1 lg:grid-cols-2` rhythm already in use. No new dependency is introduced by this package.

## 5. Relationship to the Stage 1 Transformation Assessment

The Stage 1 assessment (`docs/MASTEROPS_TRANSFORMATION_ASSESSMENT.md`) covers *what each section is called and what it eventually needs to do*. This package (D-001) covers *how the whole platform is structured, laid out, and visually composed* so that whatever each section eventually does, it does it inside a consistent, enterprise-grade shell. D-001 does not re-decide the renames or the per-section capability upgrades already assessed in Stage 1 — it assumes them as given inputs to the navigation and dashboard designs.

## 6. Success Criteria

The proposed design must:

- **Feel enterprise-grade** — an executive appearance, not a hobbyist admin panel; achieved through grouping, hierarchy, and restraint, not through added visual complexity.
- **Be simple for founders** — a first-time viewer can answer the four questions in §2 within seconds of landing on the dashboard.
- **Support future portfolio growth** — a sixth, seventh, or tenth module has a defined place to go (a navigation group, a design system primitive) without redesign.
- **Preserve existing functionality** — nothing currently working is removed or broken by adopting this foundation.
- **Provide a reusable foundation** — every future D-series deliverable builds on these primitives rather than inventing its own layout or components.

## 7. How This Package Should Be Reviewed

This package is complete and ready for Enterprise Programme Director review as a whole — the six companion documents plus the visual reference mockup referenced in `06_IMPLEMENTATION_PLAN.md`. Approval of D-001 authorises nothing beyond itself; implementation begins only under a separately approved work package (see `06_IMPLEMENTATION_PLAN.md` §Sequencing).

## 8. Implementation & Evidence Log

The design package above (§3) was approved and implemented. Each implementation and refinement work package has its own Evidence Package, kept alongside the design docs in this folder:

| Document | Work package | Covers |
|---|---|---|
| `D-002_EVIDENCE_PACKAGE.md` | D-002 — Enterprise Experience Implementation | Dashboard, sidebar, and design-system primitives built and deployed to production |
| `D-002A_EVIDENCE_PACKAGE.md` | D-002A — Sidebar label refinement | Drops the redundant "Enterprise" prefix from sidebar labels and renames "Portfolio Registry" to "Portfolio," deployed to production |

This log is updated as each subsequent D-series work package closes out.

---

**This document is a design specification; it does not itself change code. Implementation occurred separately under D-002 and D-002A (§8) — routes were never modified in either; see the linked Evidence Packages for what changed in production.**
