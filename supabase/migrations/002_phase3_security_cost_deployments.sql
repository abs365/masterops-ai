-- MasterOps Phase 3 — Security, Cost & Deployment enhancements

-- Add metadata column to security_events
alter table security_events
  add column if not exists metadata jsonb default '{}'::jsonb;

-- Security events indexes
create index if not exists security_events_project_id_idx
  on security_events(project_id);

create index if not exists security_events_severity_idx
  on security_events(severity);

create index if not exists security_events_created_at_idx
  on security_events(created_at desc);

-- API usage logs indexes
create index if not exists api_usage_logs_project_id_idx
  on api_usage_logs(project_id);

create index if not exists api_usage_logs_provider_idx
  on api_usage_logs(provider);

-- Projects index for slug lookups (used by security + cost ingest APIs)
create index if not exists projects_slug_idx
  on projects(slug);
