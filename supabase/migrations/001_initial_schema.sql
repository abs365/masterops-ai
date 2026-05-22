-- MasterOps AI Control Centre — Initial Schema
-- Run this in Supabase SQL Editor

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  url text,
  github_repo text,
  vercel_project_id text,
  supabase_project_id text,
  status text default 'unknown',
  response_time_ms integer,
  last_checked_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete set null,
  title text not null,
  message text,
  severity text default 'info',
  status text default 'open',
  created_at timestamp with time zone default now()
);

create table if not exists security_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete set null,
  event_type text,
  severity text,
  description text,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone default now()
);

create table if not exists api_usage_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete set null,
  provider text,
  endpoint text,
  request_count integer default 0,
  estimated_cost numeric default 0,
  created_at timestamp with time zone default now()
);

create table if not exists daily_reports (
  id uuid primary key default gen_random_uuid(),
  report_date date unique default current_date,
  summary text,
  risks text,
  recommendations text,
  created_at timestamp with time zone default now()
);

-- Indexes
create index if not exists idx_alerts_status on alerts(status);
create index if not exists idx_alerts_severity on alerts(severity);
create index if not exists idx_alerts_project_id on alerts(project_id);
create index if not exists idx_security_events_severity on security_events(severity);
create index if not exists idx_security_events_created_at on security_events(created_at desc);
create index if not exists idx_api_usage_logs_created_at on api_usage_logs(created_at desc);

-- Seed data
insert into projects (name, slug, url, status) values
  ('Lead Gen System',                'lead-gen-system',             null, 'unknown'),
  ('Bold English Coach',             'bold-english-coach',          null, 'unknown'),
  ('Angel 11Plus',                   'angel-11plus',                null, 'unknown'),
  ('Local Moving & Removals',        'local-moving-removals',       null, 'unknown'),
  ('Uber-style Event Planning',      'uber-style-event-planning',   null, 'unknown')
on conflict (slug) do nothing;
