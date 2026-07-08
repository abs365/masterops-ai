-- MasterOps Migration 004 — EI-001: Connect ELBOLD as a live Enterprise project
-- Data seed only. No schema change. Verified facts, no invented data:
--   production URL   https://www.elbold.com          (verified live, 200 after redirect)
--   github_repo       abs365/bold-party-planner        (verified via git remote)
--   vercel_project_id prj_xyh9hEHhk9emVMLurA7FZJmuYbIV  (verified via .vercel/project.json)
--   supabase_project_id vibqrgswyineyxmsrtsh            (verified via bold-party-planner .env.local)
-- status left as the column default ('unknown') until the monitor cron records a real check.

insert into projects (name, slug, url, github_repo, vercel_project_id, supabase_project_id, category, status)
values (
  'ELBOLD',
  'elbold',
  'https://www.elbold.com',
  'abs365/bold-party-planner',
  'prj_xyh9hEHhk9emVMLurA7FZJmuYbIV',
  'vibqrgswyineyxmsrtsh',
  'events',
  'unknown'
)
on conflict (slug) do update set
  url = excluded.url,
  github_repo = excluded.github_repo,
  vercel_project_id = excluded.vercel_project_id,
  supabase_project_id = excluded.supabase_project_id,
  category = excluded.category;
