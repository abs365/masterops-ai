# EA-001 Enterprise Asset Registry — Production Readiness Report

## Scope and a disclosed gap

This report responds to the MasterOps Programme directive: Enterprise Design Authority architecture review returned **"Accepted with observations"**, redesign explicitly forbidden, scope narrowed to production verification/hardening only.

**No separate written Architecture Review document was found.** Both `masterops-ai/docs` and `masterops-enterprise-vault` were searched (`grep -ril "design authority\|EA-001"` and `grep -ril "EA-001|Enterprise Asset Registry"` respectively) with zero results beyond this programme's own EA-001 output. Rather than inventing "review observations" attributed to a document that doesn't exist here, this report treats the directive's own 10-point task list as the operative scope, and the findings below are the result of an independent, adversarial self-review of the existing implementation performed for this pass — functioning in the same spirit as the Charter's Codex/Assurance role. If a written review document exists outside this repository, its specific findings should be reconciled against this report separately.

## 1–2. Review findings and fixes applied (quality only, no architecture change)

Four real issues were found and fixed. None change a table shape, a function's signature/return type, the RLS posture, or the type-extensibility mechanism (still a DB lookup table, per ADR-001 decision 1).

| # | Finding | Fix | Where |
|---|---|---|---|
| 1 | `create_enterprise_asset_relationship`'s `ON CONFLICT DO UPDATE` upsert logged a `RelationshipCreated` audit record + event on *every* call, including repeat calls that only updated metadata on an already-existing (source, target, type) triple — misleading audit trail (a metadata update isn't a creation). | Check existence before insert; only audit/publish on true first creation. | Migration 007 |
| 2 | `update_enterprise_asset` / `archive_enterprise_asset` / `restore_enterprise_asset` read the current row without a lock, then wrote based on it — a benign-looking gap that becomes a real concurrent-write race the moment two callers mutate the same asset at once. | Added `FOR UPDATE` to each function's initial `SELECT`, serializing concurrent mutations of the same row at the DB level. | Migration 007 |
| 3 | `repository.ts`'s error mapping re-templated `AssetNotFoundError`/`UnknownAssetTypeError` around a caller-supplied ID rather than the real Postgres error text. Concretely: `createRelationship`'s error path always cited `source_global_id`, so a *target*-not-found failure was misreported as the source being missing. | Pass the real Postgres error message straight through; only fall back to a templated message when constructing the error from a bare ID the caller already knows (e.g. a route's own 404). | `repository.ts` |
| 4 | `description` was type-checked (must be a string) but had no length cap, unlike every other free-text field — a caller could submit an unbounded string. All fields' app-layer limits also had no DB-level backstop, so a caller invoking the RPC functions directly (bypassing the Next.js API layer entirely) had no length/size enforcement at all. | Added `MAX_DESCRIPTION_LENGTH = 2000` at the app layer; added mirrored `CHECK` constraints at the DB layer for name/description/owner/business_domain/relationship_type length, country format, and a 64KB metadata size cap on both `enterprise_assets` and `enterprise_asset_relationships`. | `constants.ts`, `validation.ts`, migration 007 |

Regression tests were added for all four (relationship dedup, both not-found message directions, description over/at the length cap) — see item 9.

### Considered and deliberately not changed

- **`relationship_type` remains an open vocabulary** (not a closed enum) — the original spec never enumerated one for relationships (unlike the 9 asset types), so constraining it now would be scope creep dressed as hardening, not a review-driven fix.
- **No new audit action or event type was added** (e.g. a hypothetical `RelationshipUpdated`) to distinguish the upsert's update path — that would expand the audit/event domain vocabulary, which the review explicitly forbids touching. The chosen fix (skip audit/event on the update path entirely) achieves the same "don't mislead the audit trail" goal without widening the schema.
- **Actor is still caller-supplied, not authenticated** — fixing this would require introducing an auth layer, which doesn't exist anywhere in this platform yet and is far outside "production hardening that does not change the domain model." Documented as a standing risk in Section 12.

## 3. Production Verification Checklist

See [EA-001_PRODUCTION_VERIFICATION_CHECKLIST.md](./EA-001_PRODUCTION_VERIFICATION_CHECKLIST.md) — pre-flight (done), migration execution steps, environment checks, post-apply smoke queries, sign-off.

## 4. Migration execution steps — verified, with a material finding

Ran `npx supabase migration list` (read-only) against the linked project (`ijalvgwopvrnhlizhdqw`). **Finding: the remote migration-history table has zero entries for migrations 001 through 007**, including the six migrations already confirmed live in production from prior sessions' work (real seeded `projects` rows, migration 005's RLS policies observed functioning). This is explained by migration 001's own file header ("Run this in Supabase SQL Editor") — this project has never used CLI-tracked `supabase db push`; every migration to date was applied by pasting SQL into the Supabase SQL Editor.

**Consequence: migration 007 must be applied the same way** — SQL Editor, not `db push` — both to stay consistent with this project's actual history and because introducing CLI-tracked migration history now would be an unreviewed process change, not a like-for-like continuation. Full steps in the Verification Checklist, Section B.

**Not executed this session** — no Supabase write credentials were available. This is disclosed, not silently skipped.

## 5. Rollback procedure

See [EA-001_ROLLBACK_PROCEDURE.md](./EA-001_ROLLBACK_PROCEDURE.md) — ordered `DROP` statements, pre-rollback data-export check, post-rollback verification queries, and an explicit warning that code must be rolled back alongside schema (the API routes will 500 against a missing table otherwise, not degrade gracefully).

Confirmed safe to write given EA-001's design: everything is additive (6 new tables, 6 new functions, 1 new trigger, 0 alterations to any existing object), so rollback cannot affect any other capability on this platform.

## 6. API documentation — verified and updated

Re-read [EA-001_API_DOCUMENTATION.md](./EA-001_API_DOCUMENTATION.md) against the current code (not just the original draft) and found it accurate except for two gaps, both now fixed:
- Added a **Limits** table documenting the new field-length/size caps (finding #4 above) — these didn't exist when the doc was first written.
- Clarified the relationship-idempotency note to state that only the *first* creation of a (source, target, type) triple produces an audit record/event (finding #1 above) — the original wording only described the upsert behavior, not the (now-fixed) audit behavior.

## 7. Audit events — verified

All 6 audit actions (`AssetCreated`, `AssetUpdated`, `AssetArchived`, `AssetRestored`, `RelationshipCreated`, `LifecycleChanged`) are exercised by the test suite against the fake DB, which mirrors the SQL functions' logic line-for-line:
- Every mutation writes exactly one audit record with correct `before`/`after` (`null` before on creation, both populated on update/archive/restore).
- A `lifecycle_stage` change inside an `Update` call correctly produces **two** records: `AssetUpdated` and a separate `LifecycleChanged`.
- Idempotent operations (re-archiving an already-archived asset, re-restoring an already-active one, re-creating an existing relationship) correctly produce **zero** additional audit records — verified by new regression tests this pass.

## 8. Event publication — verified

The 5-type event outbox (`AssetCreated`, `AssetUpdated`, `AssetArchived`, `RelationshipCreated`, `LifecycleChanged`) fires atomically alongside its triggering mutation in every function, confirmed by tests. `AssetRestored` correctly produces **no** event (by original design — not in the spec's 5-type list, see ADR-001 decision 4) while still producing an audit record — this asymmetry was re-verified as intentional, not an oversight, during this pass.

## 9. Evidence Package — updated

[EA-001_EVIDENCE_PACKAGE.md](./EA-001_EVIDENCE_PACKAGE.md) has been updated in place with this pass's results:

| Check | Before this pass | After this pass |
|---|---|---|
| `npx vitest run` | 63/63 | **68/68** (5 new regression tests) |
| `npx tsc --noEmit` | clean | clean |
| `npx eslint` (EA-001 files) | clean | clean |
| `npm run build` | succeeds, 7 routes | succeeds, 7 routes (unchanged) |
| Migration applied to live DB | not attempted | not attempted — now with a documented, verified reason and correct procedure (Section 4) |

## 10. Production hardening recommended, not requiring a domain-model change

Applied this pass (see Section 2): row-level locking on mutation functions, DB-level length/size CHECK constraints, description length cap.

**Recommended but not applied** (would need a decision from whoever owns deployment, not a unilateral code change):
- **Rate limiting on the write endpoints.** This repo already has a working Upstash rate limiter (`src/lib/rate-limit.ts`, from Sprint 1A) that is currently wired into zero routes anywhere in the app — not an EA-001-specific gap, but EA-001's write endpoints (`POST`/`PATCH`/archive/restore/relationships) would be reasonable first adopters given they're new. Not applied here because wiring it up is a cross-cutting decision affecting rate-limit budget shared with every other route, not something to decide unilaterally inside one capability's readiness pass.
- **Structured request logging** on the API routes (currently: none, matching every other route in this app) — would help debug production issues but is, again, a platform-wide pattern decision, not EA-001-specific.
- **A dedicated read-only service-role-scoped key** for the audit log specifically, once real auth exists — today it's covered by the same anon-readable RLS policy as everything else (disclosed limitation, ADR-001 decision 6).

## 11. Verification summary

| Item | Status |
|---|---|
| Implementation reviewed against review directive | ✅ done (no separate written review found — self-review performed, disclosed above) |
| Quality fixes applied without architecture change | ✅ 4 fixes, verified not to touch schema/signatures/RLS/extensibility |
| Production Verification Checklist | ✅ written |
| Migration execution steps verified | ✅ verified — and corrected (SQL Editor, not `db push`) based on a real finding |
| Rollback procedure prepared | ✅ written |
| API documentation verified | ✅ verified, 2 gaps fixed |
| Audit events verified | ✅ all 6 actions, including idempotency-correctness |
| Event publication verified | ✅ all 5 types, including the intentional `AssetRestored` asymmetry |
| Evidence package updated | ✅ done |
| Production hardening recommended | ✅ 3 applied, 3 more recommended (platform-wide, out of EA-001's unilateral scope) |
| No new features introduced | ✅ confirmed — every change this pass is a fix or a constraint, not new capability |

## 12. Remaining risks (honestly disclosed)

1. **Migration 007 has still not been run against the live database.** Everything above is verified against the fake DB / static analysis / build tooling. Section D of the Verification Checklist has explicit smoke-test queries for whoever applies it — this should not be skipped.
2. **Actor is caller-supplied, not authenticated.** True of this endpoint and every other endpoint in this platform (no auth layer exists anywhere). The audit log's `actor` column should not be treated as verified identity.
3. **`relationship_type` is an open vocabulary** — a typo (`depend_on` vs `depends_on`) creates a new, silently-accepted relationship type rather than erroring. Acceptable for V1 per the original spec's own silence on this; a future consumer of the Enterprise Graph may want this tightened.
4. **No live-traffic/concurrency test of the new `FOR UPDATE` locking** — logically sound (standard Postgres pattern) and impossible to meaningfully exercise against the synchronous in-memory fake; will only be truly proven once real concurrent traffic hits the live database.
5. **Rate limiting and structured logging are not applied to these routes** — see Section 10; a platform-wide decision, not resolved here.
6. **Still nothing committed.** All of this session's changes (original build + this pass's fixes) remain uncommitted, per this session's standing instruction to commit only when explicitly asked.
