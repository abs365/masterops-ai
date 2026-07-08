-- MasterOps Migration 006 — EI-001 correction: consolidate ELBOLD's duplicate projects row
--
-- Migration 004 inserted a new 'elbold' row assuming ELBOLD had no existing
-- projects row. RLS blocking all reads (see migration 005) hid the fact that a
-- row already existed under the name "Bold Party Planner" (id 19f81f8a-5d70-
-- 4ad6-af68-07e1962e63b1, slug 'bold-party-planner', created 2026-05-21),
-- pointing at the same Vercel project (prj_xyh9hEHhk9emVMLurA7FZJmuYbIV) and
-- GitHub repo (abs365/bold-party-planner), with real monitoring history already
-- recorded (last checked 2026-07-07, response_time_ms 3573ms, status 'slow').
--
-- This migration deletes the duplicate row migration 004 inserted (id
-- c8c21766-a60c-4017-9189-1fc8d2efcc06) and updates the original, already-
-- monitored row's identity to match the Enterprise Registry: name 'ELBOLD',
-- slug 'elbold', canonical production URL https://www.elbold.com (was the raw
-- *.vercel.app URL), and adds supabase_project_id. Real monitoring history
-- (status, response_time_ms, last_checked_at, created_at) is preserved.

delete from projects where id = 'c8c21766-a60c-4017-9189-1fc8d2efcc06';

update projects
set
  name = 'ELBOLD',
  slug = 'elbold',
  url = 'https://www.elbold.com',
  supabase_project_id = 'vibqrgswyineyxmsrtsh'
where id = '19f81f8a-5d70-4ad6-af68-07e1962e63b1';
