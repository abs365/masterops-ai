# EA-002 Enterprise Identity Service — Evidence Package

**Implementation authorised by:** Enterprise Design Authority Review (2026-07-28) — Result: APPROVED, Status: L2 – Design Approved. Authorised scope: Phase 1 implementation only.

## What was built (Phase 1 only — Phases 2-5 explicitly not started, per authorisation)

- **Migration** `supabase/migrations/008_ea002_enterprise_identity_service.sql` — 5 tables (`enterprise_identity_types`, `enterprise_identities`, `enterprise_identity_audit_log`, `enterprise_identity_events`, `enterprise_identity_id_counters`), 9 Postgres functions, 1 trigger. Own independent ID counter — no shared state with EA-001's. RLS enabled on all 5 tables with **zero policies for anon/authenticated** (default-deny), not EA-001's read-all pattern — see "RLS posture" below.
- **Types**: `src/types/enterprise-identities.ts`, re-exported from `src/types/index.ts` alongside EA-001's.
- **Lib** (`src/lib/enterprise-identities/`): `constants.ts`, `validation.ts` (pure, DB-free), `repository.ts` (DB access, injectable client), `http.ts` (error → status-code mapping, extended to also map EA-001's `AssetNotFoundError` for the link-asset cross-service call).
- **API routes** (`src/app/api/enterprise-identities/`): 9 route files, 13 operations — Create/List, Search, Validate, Get/Update, Activate, Suspend, Reactivate, Deactivate, Archive, Link Asset, Unlink Asset — exactly the set proposed in `EA-002_ENTERPRISE_IDENTITY_DESIGN_SPECIFICATION.md` §7.
- **Tests**: 62 new tests (validation: 19, repository: 25, API routes: 18) using the same in-memory-fake pattern as EA-001 (`__tests__/fake-db-client.ts`, mirrors migration 008's functions' business rules line-for-line). Combined suite (EA-001 + EA-002): **130/130 passing**.

## RLS posture — Founder Decision (2026-07-28) implemented as literally as the current codebase allows

Minimum posture specified: Service Role full access / Enterprise Admin controlled access / Authenticated Users no direct table access / Public no access.

| Tier | Implemented? | How |
|---|---|---|
| Service Role: Full Access | ✅ Yes | No policy needed — Supabase's `service_role` Postgres role has `BYPASSRLS`. Every API route uses `createServiceClient()` (same as EA-001), unaffected by RLS being enabled. |
| Public: No access | ✅ Yes | RLS enabled, zero policies for `anon` — Postgres default-denies with no permissive policy present. |
| Authenticated Users: No direct table access | ✅ Yes | Same mechanism — zero policies for `authenticated` either. |
| Enterprise Admin: Controlled Access | ❌ **Not implemented — disclosed gap, not silently dropped** | There is no mechanism anywhere in this codebase to identify an Enterprise Admin at the database layer. Confirmed by the Design Spec's own grounding (§0): no auth provider exists, `ADMIN_EMAILS` (`src/app/(main)/settings/page.tsx`) is a display-only label never read by any access-control logic. Building a real check (a custom Supabase Auth claim, a role table) would be a new Access Control capability — explicitly named as a future, out-of-scope consumer in Design Spec §6, and excluded by this pass's "no additional capabilities" rule. A policy that pretended to check for "Enterprise Admin" without a real signal to check against would be worse than no policy — it would look enforced without being enforced. This is flagged here as the concrete blocker to closing this tier, for whoever scopes the future Access Control / Authentication capability. |

## Design fidelity checks performed against the Design Spec / ADR-002 while building

- **Loose coupling verified, not just asserted**: `link_enterprise_identity_asset` (the Postgres function) takes an already-resolved EA-001 asset UUID rather than reading `enterprise_assets` itself; the TypeScript `linkIdentityAsset()` resolves that UUID by calling EA-001's own `getAsset()` repository function directly (same-process, explicitly permitted by Design Spec §3/§7) — never a raw cross-table SQL read from this migration.
- **GROUP identity type**: confirmed not seeded in migration 008 (only `PERSON`/`SERVICE`/`EXTERNAL`) and confirmed rejected at both the DB layer (`UnknownIdentityTypeError`) and covered by a dedicated test — Founder Decision "Deferred, do not implement" is enforced, not just documented.
- **EA-001 zero modification**: confirmed via `git status` before and after this work — no file under EA-001's ownership (`src/lib/enterprise-assets/`, `src/app/api/enterprise-assets/`, `supabase/migrations/007_...sql`) shows as modified. The only shared file touched is `src/types/index.ts` (2 lines added: the new re-export, alongside EA-001's pre-existing one — additive, not a change to EA-001's own export).
- **Lifecycle state machine matches the Design Spec §2 diagram exactly**, including a real bug caught and fixed during test-writing (see "Implementation-phase decisions" below) rather than shipped silently.

## Implementation-phase decisions (disclosed, since the Design Spec deliberately left these to implementation)

1. **Idempotency scope for lifecycle transitions.** The Design Spec doesn't specify retry semantics. Initial implementation gave every transition an EA-001-archive/restore-style "already at target state → return success" shortcut. Testing caught a real bug this produced: `activate` (Provisioned→Active) and `reactivate` (Suspended→Active) share the same target state, so an identity that reached Active via `activate` would incorrectly report success if `reactivate` were called on it — a transition the state diagram never actually offers. **Fixed**: idempotent-return is now only applied to `suspend`/`deactivate`/`archive`, whose target states are each reachable through exactly one transition. `activate`/`reactivate` are strict — calling either from a state that isn't its single documented predecessor is a 409, including when the identity is already at the shared target via the *other* transition. Applied identically in the migration SQL and its test-fake mirror.
2. **Update blocked entirely on archived identities.** EA-001 allows re-activating an archived asset (`restore`); EA-002 has no such path (Archived is terminal per the diagram). `update_enterprise_identity` therefore rejects any archived identity outright, matching EA-001's "cannot update while archived, restore first" spirit but without a restore option to point to.
3. **`business_scope` left as an open, unvalidated string field** (not checked against `enterprise-registry.ts`'s real slugs) — matches the Design Spec §8's own accepted V1 trade-off, not a shortcut taken during implementation.
4. **Audit + event fired uniformly on every mutation** (no EA-001-style "audit-only, no event" exception) — the Design Spec doesn't name an equivalent to EA-001's deliberate restore-has-no-event omission, so the simpler, uniform default was used rather than guessed at.

## Verified, directly

| Check | Result |
|---|---|
| `npx tsc --noEmit` | Clean |
| `npx eslint src/lib/enterprise-identities src/app/api/enterprise-identities src/types/enterprise-identities.ts src/types/index.ts` | Clean |
| `npx vitest run` (full suite, EA-001 + EA-002) | **130/130 passing** (68 EA-001, unchanged + 62 new EA-002) |
| `npm run build` (`next build`) | Succeeds. All 12 new route paths present in the route table (13 operations — POST/DELETE share `[globalId]/link-asset`). |
| Two real bugs found and fixed via the test suite before this package was written | (1) activate/reactivate idempotency false-positive above; (2) `linkIdentityAsset` threw a generic `Error` instead of `AssetNotFoundError` for a missing EA-001 asset, so `errorResponse` returned 500 instead of the intended 400 — fixed by throwing the correct typed error. |

## NOT verified — disclosed, not hidden

- ~~Migration 008 has not been run against a live database.~~ **Verified live 2026-07-28** — see "Live Verification Detail" below.
- ~~No live API smoke test against a running server + real database.~~ **Partially addressed**: verified via direct RPC/SQL calls and PostgREST (the same functions and RLS the API layer calls), not by running the Next.js app itself against production — same rationale as EA-001's equivalent entry.
- **The Enterprise Admin RLS tier is unimplemented**, not merely unverified — see above. **Confirmed still true live**: `pg_policies` for `enterprise_identit%` tables returned 0 rows in production, matching the design. This remains `EXC-001` in `masterops-enterprise-vault:enterprise/08-delivery/EXCEPTION_REGISTER.md`, Accepted, not closed by this verification.
- **No load/concurrency testing** of the identity ID-generation counter (same standard atomic-increment pattern as EA-001, not empirically stressed here either) — still not tested, unrelated to live-DB availability.

## Live Verification Detail (2026-07-28)

Executed via the Supabase Management API with explicit user authorization for direct end-to-end execution, immediately following EA-001's own live verification (migration 007 applied and 9/9 smoke tests passed first, per the required gating order). Full checklist: `EA-002_PRODUCTION_VERIFICATION_PACKAGE.md` §2.

| # | Check | Result |
|---|---|---|
| Migration | Object counts | 5 tables, 9 functions, 3 identity types (`EXTERNAL`/`PERSON`/`SERVICE`, no `GROUP`), **0** RLS policies — confirms the deliberate non-read-all posture live, not just in the migration source |
| 1 | Identity types seeded | 3/3 correct, `GROUP` absent |
| 2 | Create identity via RPC, confirm global ID | `ID-SERVICE-000001` — correctly formatted |
| 3 | RLS denies anon read | Anon key: 0 rows returned (200). Cross-checked same query via service-role key: 1 row returned — confirms the 0-row anon result is genuine RLS denial, not a missing row. (Note: unlike EA-001's write-denial, which raises an explicit 401/`42501` error, RLS-denied `SELECT`s return an empty result set with 200 — standard Postgres RLS behavior for reads, not a defect.) |
| 4 | Full lifecycle walk | `provisioned → active → suspended → active → deactivated → archived`, each transition returned the correct state |
| 5 | Invalid-transition guards | Both rejected live, with the exact designed error text: archiving directly from Active (`P0001: Cannot archive identity from state "active"; must be Deactivated first`), and reactivating an identity that reached Active via `activate()` alone, never suspended (`P0001: Cannot reactivate identity from state "active"`) — **this second case is the exact bug found and fixed during the original build (Evidence Package, "Implementation-phase decisions" #1); confirmed the fix holds in production, not just in the test suite.** |
| 6 | Audit trail | 6 audit rows for the lifecycle walk, in order, `before = null` only on creation |
| 7 | Link/unlink to a real EA-001 asset | Linked successfully; re-read `MO-AUTO-000001` via EA-001's own table — `updated_at` unchanged from its own prior (EA-001) restore operation, confirming zero write ever touched EA-001's row; unlink correctly cleared `asset_id` to `null` |

**Result: 7/7 PASS** (migration verification + 7 checklist items). All test data (2 identities, their audit/event rows, and the transient link to the EA-001 test asset) deleted after evidence capture, alongside EA-001's own cleanup — confirmed 0 rows remaining in both `enterprise_assets` and `enterprise_identities` post-cleanup. Timestamps: migration applied 2026-07-28T20:08:48Z, smoke tests completed by 2026-07-28T20:10:50Z, cleanup completed 2026-07-28T20:12:25Z.

## Deliberate scope boundaries honoured

- No authentication, login, session, or permissions endpoint — confirmed by re-reading the final route list against Design Spec §7's explicit exclusion list.
- Phases 2-5 (backfill, EA-001 actor resolution, Authentication Service, Access Control Service) not started — confirmed via `git status`, no files outside the Phase 1 scope above exist.
- EA-001 untouched — see "Design fidelity checks" above.

## Files changed / added (per `git status`, this pass only)

```
M  src/types/index.ts                     (+1 line: re-export enterprise-identities types, additive)
?? docs/enterprise-foundation/EA-002_EVIDENCE_PACKAGE.md   (this file)
?? src/app/api/enterprise-identities/      (9 route files + __tests__/routes.test.ts)
?? src/lib/enterprise-identities/          (constants/validation/repository/http.ts + __tests__/)
?? src/types/enterprise-identities.ts
?? supabase/migrations/008_ea002_enterprise_identity_service.sql
```

`package.json`/`package-lock.json` show as modified but are **unchanged by this pass** — that diff is EA-001's pre-existing `vitest` addition (confirmed via `git diff`, identical to the state before this session started). No new dependency was needed for EA-002.
