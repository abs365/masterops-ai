-- MasterOps Migration 005 — EI-001: minimum read-only RLS policies for Enterprise tables
--
-- Root cause found while connecting ELBOLD (EI-001): RLS has been enabled on all 5
-- core tables since inception with ZERO policies. With RLS on and no policy, the
-- anon key (used by every read in the app via createClient()) has always returned
-- an empty result set, silently, with no error -- indistinguishable from "no data"
-- until a real row existed to test against (ELBOLD's, inserted in migration 004).
--
-- This is a read-only fix, scoped to exactly the 5 tables EI-001's Operations
-- Centre, Portfolio, and Enterprise Reporting surfaces read from. No table gets
-- more than SELECT. No INSERT/UPDATE/DELETE policy is added anywhere -- every
-- existing write path continues through the service-role client in API routes
-- (createServiceClient()), which already bypasses RLS by design and is unaffected
-- by this migration.
--
-- A blanket `using (true)` is the correct minimum here, not an over-grant: this
-- schema has no per-user or per-tenant column anywhere (no user_id/created_by on
-- any of these 5 tables), so there is no narrower boundary to express -- the app
-- itself has no authentication layer today (ADMIN_EMAILS is a display label, not
-- an enforced check), so a row-level restriction narrower than "all rows" would
-- not correspond to any real distinction the application makes.

create policy "Enterprise read access" on projects for select using (true);
create policy "Enterprise read access" on alerts for select using (true);
create policy "Enterprise read access" on security_events for select using (true);
create policy "Enterprise read access" on api_usage_logs for select using (true);
create policy "Enterprise read access" on daily_reports for select using (true);
