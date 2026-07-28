# EA-001 Enterprise Asset Registry — Production Verification Checklist

**Review outcome referenced:** MasterOps Programme — Enterprise Design Authority architecture review, "Accepted with observations." No separate written review document was found in `masterops-ai` or `masterops-enterprise-vault` (both searched); this checklist and the accompanying [Production Readiness Report](./EA-001_PRODUCTION_READINESS_REPORT.md) treat the review directive itself as the operative scope and disclose that explicitly rather than inventing findings attributed to a document that wasn't provided.

Use this checklist in order. Each step names who/what it needs and what "done" looks like. Nothing in this checklist has been executed against the live database this session (no Supabase write credentials were available) — every step below is either a local-only check (already run, marked ✅) or a live-database step still pending an operator with real access (marked ⏳).

## A. Pre-flight (local, already verified this session)

- [x] `npx tsc --noEmit` — clean, zero errors
- [x] `npx eslint src/lib/enterprise-assets src/app/api/enterprise-assets src/types/enterprise-assets.ts vitest.config.ts` — clean, zero errors/warnings
- [x] `npx vitest run` — 68/68 tests pass (validation: 27, repository: 27, API routes: 14 — up from the initial 63 after the hardening fixes below added regression coverage)
- [x] `npm run build` (`next build`) — succeeds, all 7 new routes present in the route table
- [x] Migration SQL manually reviewed for idempotency — every `CREATE TABLE`/`CREATE INDEX` uses `IF NOT EXISTS`, every function uses `CREATE OR REPLACE`, every seed `INSERT` uses `ON CONFLICT DO NOTHING` — safe to run even if partially applied before
- [x] `npx supabase migration list` — read-only check against the linked project (`ijalvgwopvrnhlizhdqw`). Result: **no migration in the remote history table for 001-007, including the six migrations already known to be live in production.** This is not a discrepancy to fix — see Section B, it changes the correct application method.

## B. Migration execution steps (⏳ needs an operator with real DB access)

**Do not run `supabase db push`.** The remote migration-history table has no record of migrations 001–006 despite them being confirmed live (real `projects` rows, migration 005's RLS policies observed working in production per prior EI-001 work) — this project has always been applied by pasting SQL directly into the Supabase SQL Editor (migration 001's own file header says so literally: "Run this in Supabase SQL Editor"), not via CLI-tracked pushes. Running `db push` now would be the first time this project's migration history table is ever populated, which is a process change, not a like-for-like continuation — that decision belongs to whoever owns this database, not to an unattended `db push`.

1. [ ] Open the Supabase SQL Editor for project `ijalvgwopvrnhlizhdqw`.
2. [ ] Paste the full contents of `supabase/migrations/007_ea001_enterprise_asset_registry.sql` and run it.
3. [ ] Confirm no errors. Expected output: 6 tables created, 1 trigger created, 6 functions created, 5 RLS policies created, 9 asset-type seed rows inserted.
4. [ ] Run the verification queries in Section D below.

## C. Environment / access checks (⏳)

- [ ] Confirm `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set in the deployed environment (Vercel) exactly as they are for every other route in this app — EA-001 reuses `createServiceClient()`, no new env var was introduced.
- [ ] Confirm the deployed app's Supabase project ref matches `ijalvgwopvrnhlizhdqw` (the one the migration was written against).

## D. Post-apply smoke verification (⏳ — run against the real DB after Section B)

Run these directly in the SQL Editor after applying the migration:

```sql
-- 1. Asset types seeded (expect 9 rows)
select count(*) from enterprise_asset_types where active = true;

-- 2. Create a real asset via the API (do this via curl/Postman against the deployed
--    app, not SQL), then confirm it landed with a correctly formatted global ID:
select global_id, asset_type_code, status, lifecycle_stage
from enterprise_assets
order by created_at desc limit 1;
-- expect global_id like 'MO-PROD-000001'

-- 3. Confirm the audit trail exists for that asset
select action, actor, before, after
from enterprise_asset_audit_log
where asset_id = (select id from enterprise_assets order by created_at desc limit 1)
order by occurred_at;
-- expect exactly one 'AssetCreated' row, before = null

-- 4. Confirm the event outbox recorded it
select event_type, payload
from enterprise_asset_events
where asset_id = (select id from enterprise_assets order by created_at desc limit 1);
-- expect exactly one 'AssetCreated' row

-- 5. Confirm RLS read-all works via anon key (run this with the anon key, not service role)
select global_id from enterprise_assets limit 1;
-- expect a row back, not a permission error

-- 6. Confirm a write via anon key is rejected (no insert/update policy exists)
insert into enterprise_assets (asset_type_code, name) values ('PRODUCT', 'RLS test');
-- run this with the anon key — expect a permission-denied error
```

- [ ] Query 1 returns 9
- [ ] Query 2 returns a well-formed global ID
- [ ] Query 3 returns exactly one `AssetCreated` audit row
- [ ] Query 4 returns exactly one `AssetCreated` event row
- [ ] Query 5 succeeds under the anon key
- [ ] Query 6 fails under the anon key (confirms writes are service-role only)
- [ ] Archive the test asset via `POST /api/enterprise-assets/{globalId}/archive`, confirm `status = 'archived'`, `archived_at` set, exactly one `AssetArchived` audit row and one `AssetArchived` event row, no duplicate on a second archive call (idempotency)
- [ ] Restore it via `POST /api/enterprise-assets/{globalId}/restore`, confirm `status = 'active'`, `archived_at = null`, one `AssetRestored` audit row, **no** `AssetRestored` event row (by design — see ADR-001 decision 4)
- [ ] Create a second test asset and a relationship between them; confirm `RelationshipCreated` audit + event fire once; repeat the same relationship create call and confirm **no** second audit/event row is added (idempotent upsert fix, Section on Review Findings in the Readiness Report)
- [ ] Delete both test assets/relationship/audit/event rows created during this smoke test (or leave them — they're harmless seed noise — but note in the sign-off which was chosen)

## E. Sign-off

- [ ] All Section D checks pass
- [ ] Rollback procedure ([EA-001_ROLLBACK_PROCEDURE.md](./EA-001_ROLLBACK_PROCEDURE.md)) has been read by whoever is applying the migration
- [ ] Founder/Design Authority sign-off recorded here: **\_\_\_\_\_\_\_\_\_\_\_\_\_\_**, date: **\_\_\_\_\_\_\_\_\_\_\_\_**
