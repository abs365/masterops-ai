# D-006 Evidence Package — Enterprise Registry

**Work Package:** D-006, approved
**Builds on:** D-004/D-004A Portfolio Workspace, D-005 Operations Centre
**Scope:** a new configuration-driven Enterprise Registry, consumed by Portfolio and (where appropriate) Operations Centre — no database, no schema, no routing change

---

## 1. Executive Summary

MasterOps now has one Enterprise Registry (`src/lib/enterprise-registry.ts`) — the single source of truth for every business MasterOps manages, current and future. It replaces two previously separate config files (`enterprise-roster.ts`, the name list, and `enterprise-stage-config.ts`, the Business Stage map) with one `EnterpriseProfile` model covering all 14 fields the work package asked for: Business Name, Short Description, Business Stage, Business Owner, Primary Website, Production URL, Development URL, Git Repository, Documentation Location, Primary Contact, Support Contact, Business Category, Date Added, and Last Reviewed.

The Portfolio page's cards and the Operations Centre's Founder Action Queue both now read from this one registry. Adding a future business means adding one entry to one file — nothing else needs to change.

No value was invented for any field the Founder hasn't confirmed. Every profile field beyond slug/name/stage/dates is `null` today, rendered as an honest gap (matching the "Not set" / "Not Yet Linked" pattern D-004A already established for Business Stage) rather than a fabricated owner, contact, URL, or category.

## 2. Architecture Summary

**One deliberate judgment call, made to protect an already-approved decision:** the work package lists "MasterOps Status" as one of the fields on "Each Enterprise Profile." It is **not** stored in the registry. D-004A explicitly separated Business Stage (hand-maintained) from MasterOps Status (always derived live from `projects` table connectivity) specifically so the two could never drift out of sync or be conflated again. Storing MasterOps Status as a static registry field would silently reopen that exact conflation. `portfolio-workspace.ts` continues to compute it live, unchanged, and attaches it to the card alongside the registry profile at read time — the Enterprise Profile type itself has no such field.

**Model:**
```
EnterpriseProfile {
  slug, businessName, shortDescription, businessStage,
  businessOwner, primaryWebsite, productionUrl, developmentUrl,
  gitRepository, documentationLocation, primaryContact, supportContact,
  businessCategory, dateAdded, lastReviewed
}
```
`ENTERPRISE_REGISTRY: EnterpriseProfile[]` is the one array every consumer reads. Two lookup helpers (`getEnterpriseProfile(slug)`, `getEnterpriseProfileByName(name)`) are the only way anything reads a profile — no consumer re-implements matching logic.

**Consumers:**
- `portfolio-workspace.ts` — replaced its `ENTERPRISE_ROSTER.map(...)` + `businessStageFor(name)` calls with one `ENTERPRISE_REGISTRY.map(...)`; `EnterpriseCardData` now carries the full `profile` object instead of separate `name`/`businessStage` fields.
- `EnterpriseCard.tsx` — reads `card.profile.businessName`/`businessStage` (same rendering as before) and additionally renders `shortDescription` when set, and falls back to `profile.productionUrl` for the "Open Workspace" link when no live `projects.url` exists yet (inert today since both are still null for every entry, but correctly wired for the next business the Founder adds).
- `founder-action-queue.ts` (Operations Centre) — the one "where appropriate" integration point: a failed-deployment item now appends `(Owner: {businessOwner})` when the registry has one on file for that business. Chosen deliberately as the single Operations Centre touchpoint rather than threading registry lookups through every panel, since the other panels (Platform Health, Deployment Summary, Integration Status) describe infrastructure signals that don't map to a single business profile field the way a failed-deployment owner does.

**Unregistered projects preserved:** D-004's original behaviour of still showing a card for any live `projects` row that isn't in the roster/registry is preserved via a small `unregisteredProfile()` helper in `portfolio-workspace.ts`, clearly labelled `"Not yet added to the Enterprise Registry."` rather than silently dropped or given invented registry data.

## 3. Files Changed

Commit `ac0d61e` — 7 files changed, 203 insertions(+), 59 deletions(-) (pre-existing, unrelated working-tree changes — `package.json`, `package-lock.json`, untracked `src/lib/rate-limit.ts`, untracked `docs/MASTEROPS_TRANSFORMATION_ASSESSMENT.md` — left untouched, consistent with every prior D-package):

**Added:**
- `src/lib/enterprise-registry.ts` — the Enterprise Registry: `EnterpriseProfile` type, `ENTERPRISE_REGISTRY` (6 entries, one per business already on the roster), `getEnterpriseProfile()`, `getEnterpriseProfileByName()`

**Removed (superseded, avoids duplicating the same data in two places):**
- `src/lib/enterprise-roster.ts`
- `src/lib/enterprise-stage-config.ts`

**Modified:**
- `src/lib/portfolio-workspace.ts` — reads `ENTERPRISE_REGISTRY` instead of the roster + stage config; `EnterpriseCardData.profile` replaces the separate `name`/`businessStage` fields; added `unregisteredProfile()` fallback
- `src/components/projects/EnterpriseCard.tsx` — destructures `card.profile`, renders `shortDescription` when set, uses `profile.productionUrl` as a fallback workspace link
- `src/components/projects/PortfolioWorkspace.tsx` — `key={card.profile.slug}` (was `card.name`)
- `src/lib/founder-action-queue.ts` — failed-deployment items now resolve and append the registry's Business Owner when known

## 4. Before / After

| | Before (D-004/D-004A) | After (D-006) |
|---|---|---|
| Business name + stage source | Two files: `ENTERPRISE_ROSTER` (names) + `BUSINESS_STAGE_CONFIG` (stage) | One file: `ENTERPRISE_REGISTRY`, 14 fields per business |
| Portfolio card data shape | `{ name, project, businessStage, masterOpsStatus, operationalBucket }` | `{ profile, project, masterOpsStatus, operationalBucket }` — `profile` is the full Enterprise Registry entry |
| Portfolio card content | Business name, Business Stage badge, MasterOps Status badge, last activity, Open Workspace/Not Yet Linked | Same, plus a Short Description line when the registry has one (none do yet, so no visible change today) |
| Portfolio card workspace link | Only `project.url` | `project.url`, falling back to `profile.productionUrl` if no live project is connected yet |
| Operations Centre Founder Action Queue, failed deployment item | `"ELBOLD, MeritBold"` | `"ELBOLD, MeritBold"` today (unchanged — no owners on file yet); becomes `"ELBOLD (Owner: Jane Doe), MeritBold"` once the registry has an owner |
| Adding a 7th future business | Edit 2 files (roster array + stage config map) | Edit 1 file (add one `EnterpriseProfile` entry to `ENTERPRISE_REGISTRY`) |

## 5. Commit Hash

`ac0d61e` — `feat: implement D-006 Enterprise Registry`, on branch `main`, pushed to `origin/main` (`51332e1..ac0d61e`).

## 6. Local Verification

`npm run build` completed cleanly — TypeScript passed, all 20 routes generated unchanged (same route list as after D-005; no route added, removed, or broken).

Ran `npm run dev` and curled `/projects` and `/operations`:
- `/projects` → 200; all 6 registry businesses (ELBOLD, Master Growth OS, Football Intelligence Group, ChurchOS, FamilyOS, MeritBold) render; "Not set" (Business Stage) and "Not Yet Linked" (workspace link) honest-empty states intact, same count as before the change
- `/operations` → 200; Operations Centre, Founder Action Queue, and Platform Health headings all present, unaffected

## 7. Production Deployment Verification

**Deployed and confirmed.** Pushed to `origin/main`; Vercel auto-deployed.

- **URL:** https://masterops-ai.vercel.app/projects
- `HTTP/1.1 200`, `X-Matched-Path: /projects`, `X-Vercel-Cache: MISS`, `Age: 0` — a fresh dynamic render, not a stale cached asset
- Content check on the live HTML confirms all 6 businesses, "Not set", and "Not Yet Linked" render identically to local verification
- Spot-checked `/operations` on production (200, Operations Centre / Founder Action Queue / Platform Health all present) — no regression

## 8. Confirmation: No Business Logic Changed

- **Queries** — `getRegisteredProjects()` in `portfolio-workspace.ts` is byte-identical to before (`supabase.from('projects').select('*').order('name')`); `masterOpsStatusFor()` and `operationalBucketFor()` are untouched. No table, filter, or column added or altered.
- **Schema** — no migration added. The Enterprise Registry is a TypeScript constant, not a database table, per the work package's explicit "do not introduce a database" instruction.
- **Routing** — no route added, removed, or changed. `/projects` and `/operations` resolve exactly as before.
- **Integrations/APIs** — no new external call introduced.
- **Master Growth OS** — not referenced or touched.
- **Duplication eliminated, not introduced** — `enterprise-roster.ts` and `enterprise-stage-config.ts` were deleted once their content was merged into the registry; nothing now holds two copies of the same business list or stage map.
- **Invented data** — none. All 14 fields beyond slug/name/stage/dates are `null` for every one of the 6 businesses; Business Stage remains "Unspecified" for all, unchanged from D-004A, since no real stage has been confirmed by the Founder.

---

**Stop condition honoured:** D-007 has not been started.
