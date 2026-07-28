# EA-001 Enterprise Asset Registry — Rollback Procedure

This is a manual runbook, not an auto-run migration file — matching how this project's migrations are actually applied (see the [Verification Checklist](./EA-001_PRODUCTION_VERIFICATION_CHECKLIST.md) Section B: SQL Editor, not `supabase db push`). Run these statements the same way — pasted into the Supabase SQL Editor for project `ijalvgwopvrnhlizhdqw`.

## When to use this

Only if migration 007 needs to be fully backed out — e.g. a defect is found post-apply that can't be fixed forward with another migration. EA-001 is entirely additive (new tables/functions only; nothing existing was altered), so rollback is a clean removal with **zero risk to any other capability** in this platform — no existing table, function, or row is touched by either the forward migration or this rollback.

## Pre-rollback check

If any real assets were created before the decision to roll back, decide first whether that data needs to be exported/preserved. This procedure **permanently deletes every row** in the 6 new tables.

```sql
select count(*) from enterprise_assets;
select count(*) from enterprise_asset_relationships;
select count(*) from enterprise_asset_audit_log;
select count(*) from enterprise_asset_events;
```

If any of these are non-zero and the data matters, export it (`copy (select * from enterprise_assets) to stdout with csv header` or the SQL Editor's export button) before proceeding.

## Rollback statements (run in this exact order — reverse of creation, to respect foreign keys)

```sql
-- 1. Drop RLS policies (not strictly required before dropping tables, but explicit)
drop policy if exists enterprise_asset_events_read_all on enterprise_asset_events;
drop policy if exists enterprise_asset_audit_log_read_all on enterprise_asset_audit_log;
drop policy if exists enterprise_asset_relationships_read_all on enterprise_asset_relationships;
drop policy if exists enterprise_assets_read_all on enterprise_assets;
drop policy if exists enterprise_asset_types_read_all on enterprise_asset_types;

-- 2. Drop mutation functions
drop function if exists create_enterprise_asset_relationship(text, text, text, jsonb, text);
drop function if exists restore_enterprise_asset(text, text);
drop function if exists archive_enterprise_asset(text, text);
drop function if exists update_enterprise_asset(text, text, text, text, text, text, text, text, jsonb, text);
drop function if exists create_enterprise_asset(text, text, text, text, text, text, text, text, jsonb, text);

-- 3. Drop trigger + trigger function (drops with the table too, but explicit for clarity)
drop trigger if exists trg_enterprise_assets_updated_at on enterprise_assets;
drop function if exists set_enterprise_assets_updated_at();

-- 4. Drop ID generation
drop function if exists generate_enterprise_asset_global_id(text);
drop table if exists enterprise_asset_id_counters;

-- 5. Drop dependent tables first (relationships/audit/events reference enterprise_assets)
drop table if exists enterprise_asset_events;
drop table if exists enterprise_asset_audit_log;
drop table if exists enterprise_asset_relationships;

-- 6. Drop the core table (this also drops its indexes, the search_vector generated
--    column, and the CHECK constraints automatically)
drop table if exists enterprise_assets;

-- 7. Drop the type lookup table last (nothing depends on it once enterprise_assets is gone)
drop table if exists enterprise_asset_types;
```

## Post-rollback verification

```sql
select table_name from information_schema.tables
where table_schema = 'public' and table_name like 'enterprise_asset%';
-- expect 0 rows

select routine_name from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'generate_enterprise_asset_global_id', 'create_enterprise_asset', 'update_enterprise_asset',
    'archive_enterprise_asset', 'restore_enterprise_asset', 'create_enterprise_asset_relationship',
    'set_enterprise_assets_updated_at'
  );
-- expect 0 rows
```

- [ ] Both verification queries return zero rows
- [ ] Confirm no other table's data changed (`projects`, `alerts`, `security_events`, `api_usage_logs`, `daily_reports` row counts unchanged from before rollback — none of them reference or are referenced by any `enterprise_asset*` table)
- [ ] `next build` in the app still succeeds — note that **the application code itself is not rolled back by this procedure**. If the migration is rolled back, `src/app/api/enterprise-assets/*` and `src/lib/enterprise-assets/*` must also be reverted/undeployed (via git revert of the corresponding commit), or every request to those routes will fail at the `db.rpc(...)` / `db.from('enterprise_assets')` call with "relation does not exist" — a 500, not a graceful degradation. Roll back code and schema together, not schema alone.
