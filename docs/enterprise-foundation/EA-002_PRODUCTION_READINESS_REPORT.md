# EA-002 Enterprise Identity Service — Production Readiness Report (Phase 1)

## Scope

This is EA-002's first Production Readiness pass, produced immediately after Phase 1's initial build (no separate hardening pass has occurred yet, unlike EA-001 which had one — there is nothing to harden here beyond what's already been through code review during this same implementation). Everything in this report is either a local-only check (done, ✅) or a live-database step still pending an operator with real Supabase credentials (⏳) — same standing gap as EA-001, not a new one introduced by this capability.

## A. Pre-flight (local, verified this session)

- [x] `npx tsc --noEmit` — clean, zero errors
- [x] `npx eslint src/lib/enterprise-identities src/app/api/enterprise-identities src/types/enterprise-identities.ts src/types/index.ts` — clean, zero errors/warnings
- [x] `npx vitest run` — 130/130 tests pass (62 new for EA-002: validation 19, repository 25, API routes 18; 68 pre-existing EA-001 tests unaffected)
- [x] `npm run build` (`next build`) — succeeds, all 12 new route paths present in the route table
- [x] Migration SQL manually reviewed for idempotency — every `CREATE TABLE`/`CREATE INDEX` uses `IF NOT EXISTS`, every function uses `CREATE OR REPLACE`, every seed `INSERT` uses `ON CONFLICT DO NOTHING` — safe to run even if partially applied before, same convention as migration 007
- [x] Confirmed migration 008 makes no change whatsoever to any EA-001 table, function, or policy — the only reference to `enterprise_assets` is a nullable, outbound FK on the new `enterprise_identities` table

## B. Migration execution steps (⏳ needs an operator with real DB access)

Same standing constraint as EA-001: this project has never used `supabase db push` (no CLI-tracked migration history exists for 001–007 despite six of them being live) — apply via the Supabase SQL Editor, consistent with every prior migration in this project.

1. [ ] Open the Supabase SQL Editor for project `ijalvgwopvrnhlizhdqw`.
2. [ ] Confirm migration 007 (EA-001) has already been applied first — migration 008 declares a foreign key into `enterprise_assets`, which must exist.
3. [ ] Paste the full contents of `supabase/migrations/008_ea002_enterprise_identity_service.sql` and run it.
4. [ ] Confirm no errors. Expected: 5 tables created, 1 trigger, 9 functions, RLS enabled on all 5 tables, 3 identity-type seed rows inserted (`PERSON`, `SERVICE`, `EXTERNAL` — not `GROUP`, deliberately).
5. [ ] Run the verification queries in Section C below.

## C. Post-apply smoke verification (⏳ — run against the real DB after Section B)

```sql
-- 1. Identity types seeded (expect 3 rows, GROUP absent)
select code from enterprise_identity_types where active = true order by code;
-- expect: EXTERNAL, PERSON, SERVICE

-- 2. Create a real identity via the API (curl/Postman against the deployed app),
--    then confirm it landed with a correctly formatted global ID:
select global_id, identity_type_code, lifecycle_state
from enterprise_identities order by created_at desc limit 1;
-- expect global_id like 'ID-PERSON-000001', lifecycle_state = 'provisioned'

-- 3. Confirm RLS actually denies anon/authenticated reads (this is the
--    inverse of EA-001's check — EA-002 deliberately does NOT read-all)
select global_id from enterprise_identities limit 1;
-- run this with the ANON key — expect a permission-denied error, NOT a row back

-- 4. Confirm service role still has full access (routes use this internally)
-- (run via the app's own API, which uses the service role key server-side —
--  a successful GET/POST through the app confirms this without a raw SQL check)

-- 5. Confirm the audit trail exists for the identity created in step 2
select action, actor, before, after
from enterprise_identity_audit_log
where identity_id = (select id from enterprise_identities order by created_at desc limit 1)
order by occurred_at;
-- expect exactly one 'IdentityCreated' row, before = null

-- 6. Walk the lifecycle via the API (activate -> suspend -> reactivate ->
--    deactivate -> archive) and confirm each POST returns 200 with the
--    expected lifecycle_state, and that archiving from Active directly
--    (skipping Deactivated) is rejected with 409
```

- [ ] Query 1 returns exactly `EXTERNAL, PERSON, SERVICE`
- [ ] Query 2 returns a well-formed `ID-` global ID
- [ ] Query 3 fails under the anon key (confirms the deliberate non-read-all RLS posture)
- [ ] A full lifecycle walk (activate → suspend → reactivate → deactivate → archive) succeeds through the live API
- [ ] Query 5 returns exactly one `IdentityCreated` audit row
- [ ] Link/unlink a test identity to a real EA-001 asset; confirm EA-001's own asset row is unaffected (no write from this service ever touches `enterprise_assets`)
- [ ] Delete the test identity/audit/event rows created during this smoke test, or leave them and note that choice here

## D. Standing risk, not resolved by this pass

**Enterprise Admin RLS tier is unimplemented** (see `EA-002_EVIDENCE_PACKAGE.md`, "RLS posture"). No mechanism exists in this codebase to identify an Enterprise Admin at the database layer. Until an Access Control / Authentication capability exists, any Enterprise Admin operation against this data goes through the same service-role-backed API layer as every other caller today — i.e. no tier distinction is actually enforced beyond "server-side code" vs. "direct DB access," which is the same standing risk EA-001 already carries and disclosed (no auth anywhere yet). Not new to EA-002, but more consequential here given real PII is now in scope.

## E. Rollback procedure

Migration 008 is purely additive — 5 new tables, 9 new functions, 1 new trigger, all newly named, zero modification to any existing table/function/policy (confirmed in Section A). Rollback is:

```sql
drop trigger if exists trg_enterprise_identities_updated_at on enterprise_identities;
drop function if exists unlink_enterprise_identity_asset(text, text);
drop function if exists link_enterprise_identity_asset(text, uuid, text);
drop function if exists archive_enterprise_identity(text, text);
drop function if exists deactivate_enterprise_identity(text, text);
drop function if exists reactivate_enterprise_identity(text, text);
drop function if exists suspend_enterprise_identity(text, text);
drop function if exists activate_enterprise_identity(text, text);
drop function if exists update_enterprise_identity(text, text, text, text, text, text, jsonb, text);
drop function if exists create_enterprise_identity(text, text, text, text, text, text, jsonb, text);
drop function if exists generate_enterprise_identity_global_id(text);
drop function if exists set_enterprise_identities_updated_at();
drop table if exists enterprise_identity_events;
drop table if exists enterprise_identity_audit_log;
drop table if exists enterprise_identities;
drop table if exists enterprise_identity_id_counters;
drop table if exists enterprise_identity_types;
```

No EA-001 object is touched by this rollback. Application-layer rollback is deleting `src/app/api/enterprise-identities/`, `src/lib/enterprise-identities/`, `src/types/enterprise-identities.ts`, and the one added line in `src/types/index.ts`.

## F. Sign-off

- [ ] All Section C checks pass
- [ ] Rollback procedure above has been read by whoever is applying the migration
- [ ] Founder/Design Authority sign-off recorded here: **\_\_\_\_\_\_\_\_\_\_\_\_\_\_**, date: **\_\_\_\_\_\_\_\_\_\_\_\_**
