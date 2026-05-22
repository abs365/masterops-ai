-- MasterOps Migration 003 — Project categories + Kent Removals

-- Add category column
alter table projects
  add column if not exists category text default 'general';

-- Seed Kent Removals (safe upsert — no duplicate if already exists)
insert into projects (name, slug, url, status, category)
values ('Kent Removals', 'kent-removals', null, 'unknown', 'removals')
on conflict (slug) do update set category = 'removals';

-- Update categories on existing seeded projects
update projects set category = 'leadgen'    where slug = 'lead-gen-system';
update projects set category = 'education'  where slug = 'bold-english-coach';
update projects set category = 'education'  where slug = 'angel-11plus';
update projects set category = 'removals'   where slug = 'local-moving-removals';
update projects set category = 'events'     where slug = 'uber-style-event-planning';

-- Index for category filtering
create index if not exists projects_category_idx on projects(category);
