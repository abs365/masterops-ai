# Enterprise Navigation Specification

**Part of:** D-001 — Enterprise Experience Foundation
**Scope:** Navigation philosophy only. Grouping and structure, not visual styling (see `02_ENTERPRISE_SIDEBAR_DESIGN.md`) and not routes (unchanged).

---

## 1. Problem With Navigation-as-a-List

The current sidebar is ten flat, equally-weighted links in registration order. It is complete but it teaches nothing: a first-time founder sees ten words and has no way to know which ones matter more, which are related, or what MasterOps's overall shape is. A flat list scales badly too — a future eleventh and twelfth module can only ever be appended at the bottom, growing the list rather than growing the enterprise's expressed structure.

## 2. Principle: Navigation Teaches the Enterprise

Navigation should express a mental model, not a menu. The grouping itself is the first thing a founder learns about how MasterOps thinks about the portfolio — before they click anything. The test for a correct grouping: if a founder read only the group labels (not the items inside them), would they already have a roughly correct idea of what MasterOps does?

## 3. The Enterprise Map

Ten renamed sections (per the Stage 1 Transformation Assessment) resolve into four questions a founder actually asks, in the order they ask them:

1. **Where am I?** — a single, always-visible anchor. Not a group; a landing point.
2. **What do I have, and what needs attention?** — the portfolio itself and its risk surface, together, because a founder does not think of "what I own" and "what's wrong with it" as separate concerns.
3. **How is it running?** — the operational mechanics: spend, continuity, releases.
4. **What's coming in, and what does it mean?** — growth signal and executive synthesis, together, because opportunity and insight are both forward-looking, not operational.

A fifth item — configuration — sits outside this question set entirely: it is not something a founder asks about the enterprise, it is how the enterprise is set up. It is placed last and treated as a system-level anchor, mirroring the Overview anchor at the top.

## 4. Enterprise Map — Grouping Table

| Zone | Question it answers | Sections it contains |
|---|---|---|
| *(anchor, top)* | Where am I? | Enterprise Control Centre |
| **Portfolio & Risk** | What do I have, and what needs attention? | Portfolio Registry · Enterprise Security Centre · Enterprise Risk and Alert Centre |
| **Operations** | How is it running? | Enterprise Cost Intelligence · Enterprise Continuity · Enterprise Release and Deployment Centre |
| **Growth & Intelligence** | What's coming in, and what does it mean? | Enterprise Opportunity Intelligence · Executive Intelligence |
| *(anchor, bottom)* | How is it configured? | Enterprise Configuration |

This turns "ten things to scan" into "five things to understand" — two anchors and three named zones — without removing a single existing page or route.

## 5. Navigation Principles

1. **The Overview anchor is never buried.** Enterprise Control Centre is always the first item, never inside a group, always the default landing route — consistent with its role as "where am I."
2. **Groups are named after what they answer, not what they contain.** "Portfolio & Risk" teaches more than "Section Group 1"; a founder should be able to guess most of a group's contents from its name alone.
3. **Configuration is structurally separate from the enterprise-questions groups.** It answers "how is this set up," not "what's happening in my portfolio" — conflating the two would dilute both.
4. **Progressive disclosure over deletion.** Nothing is hidden permanently; grouping and visual weight (see `02_ENTERPRISE_SIDEBAR_DESIGN.md`) do the work of reducing cognitive load, not removing access to any section.
5. **New modules join by concept-fit, not by appending.** A future module is placed into whichever existing zone answers the same question it answers. A module that fits none of the four questions is a signal to reconsider the Enterprise Map itself before adding a fifth zone — zones should stay few.
6. **Labels are founder-language, not system-language.** Every label in the Enterprise Map is a business term a non-technical founder already understands (per the Stage 1 renames) — no internal jargon, abbreviations, or implementation detail appears in navigation.

## 6. Explicitly Not Covered Here

- Visual treatment of groups (dividers, spacing, collapse behaviour, active-state styling) — see `02_ENTERPRISE_SIDEBAR_DESIGN.md`.
- Any change to route paths, page components, or data — none is proposed.
- The internal content of any grouped section — see the Stage 1 Transformation Assessment and (for future capability) `06_IMPLEMENTATION_PLAN.md`.
