# EA-001 Enterprise Asset Registry — Evidence Package

**Updated during the Production Verification pass** (MasterOps Programme directive, Enterprise Design Authority review "Accepted with observations") — Section "Verified" and "Success criteria" reflect the post-hardening state; original build results are preserved in git history via this file's prior version. Full findings/fixes in [EA-001_PRODUCTION_READINESS_REPORT.md](./EA-001_PRODUCTION_READINESS_REPORT.md).

## Repository Discovery (performed before any code was written)

- `projects` table (migration 001): 6-column monitoring table (name/slug/url/github_repo/vercel_project_id/status), no lifecycle/metadata/relationships/audit. Used by Portfolio Health / Alerts / Deployment Summary. Left untouched.
- `enterprise-registry.ts` (D-006): static, no-DB, TypeScript config array of the 6-7 portfolio businesses; no audit/events/relationships. Left untouched.
- No `audit`, `event`, or asset-registry pattern found anywhere else in the repo (`grep -riE "audit|AssetCreated|asset_type|Global ID|MO-ENT|Asset Registry"` across the whole tree, excluding `node_modules`, returned only unrelated docs).
- `src/lib/security/` and `src/lib/monitoring/` are empty directories (confirms prior-session memory that `MASTEROPS_ARCHITECTURE.md` describes code that doesn't actually exist).
- Conclusion: genuinely new, additive capability. Nothing to extend, nothing to reuse, nothing that needed to stay untouched beyond "don't touch `projects` / `enterprise-registry.ts`."

## What was built

- **Migration** `supabase/migrations/007_ea001_enterprise_asset_registry.sql` — 6 tables (`enterprise_asset_types`, `enterprise_assets`, `enterprise_asset_relationships`, `enterprise_asset_audit_log`, `enterprise_asset_events`, `enterprise_asset_id_counters`), 6 Postgres functions, 1 trigger, RLS read-all policy on every new table (matches migration 005's platform-wide pattern).
- **Types**: `src/types/enterprise-assets.ts`, re-exported from `src/types/index.ts`.
- **Lib** (`src/lib/enterprise-assets/`): `constants.ts`, `validation.ts` (pure, DB-free), `repository.ts` (DB access, injectable client), `http.ts` (shared error → status-code mapping).
- **API routes** (`src/app/api/enterprise-assets/`): 7 route files, 9 operations — Create/List, Search, Validate, Get/Update, Archive, Restore, Create/List Relationships.
- **Tests**: `vitest` (new devDependency — this repo had zero test infrastructure before EA-001), `vitest.config.ts`, an in-memory fake Postgres/Supabase client (`__tests__/fake-db-client.ts`) that mirrors the migration's RPC functions' business rules line-for-line, 68 tests across validation (unit), repository (integration, against the fake), and API routes (real `route.ts` handlers + real `NextRequest`, only `createServiceClient` mocked to the fake).
- **Docs**: this evidence package, [ADR-001](./ADR-001-enterprise-asset-registry.md), [API documentation](./EA-001_API_DOCUMENTATION.md), [Production Verification Checklist](./EA-001_PRODUCTION_VERIFICATION_CHECKLIST.md), [Rollback Procedure](./EA-001_ROLLBACK_PROCEDURE.md), [Production Readiness Report](./EA-001_PRODUCTION_READINESS_REPORT.md).

## Verified (original build + Production Verification pass, directly)

| Check | Original build | After Production Verification pass |
|---|---|---|
| `npx vitest run` | 63/63 tests passed (validation: 25, repository: 24, API routes: 14) | **68/68** (validation: 27, repository: 27, API routes: 14 — 5 new regression tests for the pass's fixes) |
| `npx tsc --noEmit` | Clean | Clean |
| `npx eslint <new files>` | Clean (after fixing 1 misplaced `eslint-disable` comment and 1 unused test import found during the original build) | Clean |
| `npm run build` (`next build`) | Succeeds, all 7 routes listed | Succeeds, all 7 routes listed (unchanged) |
| `npm audit` | Pre-existing high-severity findings in `next`/`postcss`/`sharp`/`js-yaml`/`brace-expansion` observed — pre-date this work, unrelated (Next.js/eslint/toolchain transitive deps), not remediated, out of scope | Unchanged — not re-run, no new dependency added this pass |
| `npx supabase migration list` (read-only) | Not run | **Run.** Finding: remote migration-history table has zero entries for 001–007, including migrations already known live in production — this project applies migrations via the SQL Editor, not `supabase db push`. See the Readiness Report §4. |

**Production Verification pass fixes** (quality only, no schema/architecture change — full detail in the Readiness Report §1–2): relationship audit/event no longer duplicates on idempotent metadata-only upserts; `update`/`archive`/`restore` functions now take a row lock (`FOR UPDATE`) closing a concurrent-mutation race; error messages now report the actually-missing asset (source vs. target) instead of always citing the caller's original ID; `description` gained an app-layer length cap it was missing, and DB-level length/size `CHECK` constraints were added across the board as defense-in-depth for direct-RPC callers.

## Live Verification (2026-07-28) — see full detail below

**Migration 007 applied to the live production Supabase project (`ijalvgwopvrnhlizhdqw`) on 2026-07-28.** All 9 smoke-test checklist items passed against the real database. This section supersedes the "NOT verified" caveats below regarding live application — those caveats accurately described the state at original build time and are preserved for the historical record.

## NOT verified at original build time — since verified live, 2026-07-28 (see "Live Verification" above)

- ~~Migration 007 has not been run against a live database.~~ **Verified live 2026-07-28** — see below.
- ~~No live API smoke test against a running `next dev` server + real database.~~ **Partially addressed**: verified via direct RPC/SQL calls and PostgREST (the same functions and RLS the API layer calls), not by running the Next.js app itself against production — app-routing/validation/error-mapping correctness is already covered by the 68-test suite against a faithful DB mirror; this pass specifically validated the real Postgres engine and real RLS enforcement, which no prior session could reach.
- No load/concurrency testing of the ID-generation counter (the `UPDATE ... RETURNING` pattern is standard atomic-increment and should be safe under concurrent inserts, but this wasn't empirically stressed) — **still not tested, unrelated to live-DB availability.**

## Live Verification Detail (2026-07-28)

Executed via the Supabase Management API (`SUPABASE_ACCESS_TOKEN`, real credentials present in `.env.local` for the first time in this arc's history), with explicit user authorization for direct end-to-end execution. Full checklist: `EA-001_PRODUCTION_VERIFICATION_CHECKLIST.md` §D.

| # | Check | Result |
|---|---|---|
| 1 | Asset types seeded | 9/9, matches migration exactly |
| 2 | Create asset via RPC, confirm global ID | `MO-AUTO-000001` — correctly formatted |
| 3 | Audit trail | 1 `AssetCreated` row, `before = null` |
| 4 | Event outbox | 1 `AssetCreated` event row |
| 5 | RLS read-all via anon key | 200, row returned |
| 6 | RLS write via anon key | 401, `42501` row-level security violation — correctly rejected |
| 7 | Archive twice (idempotency) | Same `archived_at` both calls; exactly 1 `AssetArchived` audit row |
| 8 | Restore | `status=active`, `archived_at=null`; 1 `AssetRestored` audit row, **0** `AssetRestored` event rows (by design, ADR-001 decision 4) |
| 9 | Relationship create + repeat call (dedup) | Same relationship ID both calls; exactly 1 `RelationshipCreated` audit row despite 2 calls |

**Result: 9/9 PASS.** All test data (2 assets, their audit/event/relationship rows) deleted after evidence capture — confirmed 0 rows remaining post-cleanup, schema objects (9 types, 6 tables) confirmed intact afterward. Full raw query outputs retained in the session transcript backing this report; timestamps: migration applied 2026-07-28T20:06:26Z, smoke tests completed by 2026-07-28T20:08:45Z, cleanup completed 2026-07-28T20:12:25Z.

## Deliberate scope boundaries honoured

- No dashboard, UI, chart, digital twin, reporting, analytics, or Executive Workspace — per EA-001's explicit "Out of Scope."
- `projects` table and `enterprise-registry.ts` untouched — no migration of existing portfolio data into the new registry was attempted or implied by EA-001.
- `docs/MASTEROPS_TRANSFORMATION_ASSESSMENT.md`, `src/lib/rate-limit.ts`, and `supabase/.temp/` are pre-existing untracked files from before this session (confirmed via `git status`) — not created or modified by this work.

## Files changed / added (per `git status`)

```
M  package-lock.json                  (vitest + transitive deps)
M  package.json                       (vitest devDependency, "test"/"test:watch" scripts)
M  src/types/index.ts                 (1 line: re-export enterprise-assets types)
?? docs/enterprise-foundation/        (this file, ADR-001, API documentation, verification checklist, rollback procedure, readiness report)
?? src/app/api/enterprise-assets/     (7 route files + __tests__/routes.test.ts)
?? src/lib/enterprise-assets/         (constants/validation/repository/http.ts + __tests__/)
?? src/types/enterprise-assets.ts
?? supabase/migrations/007_ea001_enterprise_asset_registry.sql
?? vitest.config.ts
```

## Commit status

**Nothing has been committed.** Per this session's standing instruction, commits are only created when explicitly requested. Ready to commit and push once reviewed.

## Success criteria — status

| Criterion | Status |
|---|---|
| An enterprise asset can be registered | ✅ verified against the fake DB + real route handlers; ⏳ not yet against a live database |
| A permanent identifier is generated | ✅ verified — `MO-<PREFIX>-<6 digits>`, monotonic per prefix |
| The asset is searchable | ✅ verified — free-text search via `tsvector`/GIN in the migration, mirrored and tested in the fake |
| Relationships are supported | ✅ verified — create, dedupe/upsert (audit-correct — no longer double-logs on idempotent re-creation), list from either side |
| Audit records exist | ✅ verified — every mutation writes one, including a distinct `LifecycleChanged` record on stage transitions, correctly zero extra records on idempotent operations |
| Events are published | ✅ verified — 5-type outbox table, atomic with its triggering mutation |
| Tests pass | ✅ 68/68 |
| Build succeeds | ✅ `next build` clean |
| Production-ready | ⏳ code/tests/docs ready; **migration not yet applied to a live database** — see [Production Readiness Report](./EA-001_PRODUCTION_READINESS_REPORT.md) §12 for full remaining-risk list |
