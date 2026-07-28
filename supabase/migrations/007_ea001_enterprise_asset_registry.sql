-- MasterOps Migration 007 — EA-001 Enterprise Asset Registry
-- Enterprise Foundation capability: authoritative registry for every enterprise
-- asset (Enterprise, Product, Operating System, Shared Service, Capability,
-- Workspace, Team, Automation, Knowledge Asset, and any future type).
--
-- Design notes (see docs/enterprise-foundation/ADR-001-enterprise-asset-registry.md
-- for full rationale):
--   * Asset TYPE is a lookup table (enterprise_asset_types), not a CHECK
--     constraint, so a new type is a row insert, never a schema change.
--   * Every mutation (create/update/archive/restore/relationship-create) is a
--     single Postgres function so the primary write, its audit record, and its
--     domain event commit atomically in one transaction — no dual-write gap.
--   * RLS is enabled with a read-all policy on every new table, matching the
--     existing platform-wide pattern (migration 005) — this repo has no
--     authentication layer anywhere yet, so anon-key reads are already
--     unrestricted on every other table; writes remain service-role only
--     (no insert/update/delete policy granted).

-- ============================================================
-- 1. Asset type lookup (extensible without schema redesign)
-- ============================================================

create table if not exists enterprise_asset_types (
  code text primary key,
  prefix text not null unique,
  label text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into enterprise_asset_types (code, prefix, label, description) values
  ('ENTERPRISE',       'ENT',  'Enterprise',        'The enterprise itself, e.g. MasterOps.'),
  ('PRODUCT',          'PROD', 'Product',            'A commercial or internal software product.'),
  ('OPERATING_SYSTEM',  'OS',  'Operating System',   'A "*OS" platform layer (e.g. Master Growth OS).'),
  ('SHARED_SERVICE',   'SVC',  'Shared Service',     'A reusable enterprise-wide service.'),
  ('CAPABILITY',       'CAP',  'Capability',         'A discrete enterprise or product capability.'),
  ('WORKSPACE',        'WS',   'Workspace',          'A team or project workspace.'),
  ('TEAM',             'TEAM', 'Team',               'A team of people.'),
  ('AUTOMATION',       'AUTO', 'Automation',         'An automated workflow, job, or agent.'),
  ('KNOWLEDGE_ASSET',  'KA',   'Knowledge Asset',    'A governed document, standard, or decision record.')
on conflict (code) do nothing;

-- ============================================================
-- 2. Immutable global ID generation
-- ============================================================

create table if not exists enterprise_asset_id_counters (
  prefix text primary key,
  next_value bigint not null default 1
);

create or replace function generate_enterprise_asset_global_id(p_prefix text)
returns text
language plpgsql
as $$
declare
  v_value bigint;
begin
  insert into enterprise_asset_id_counters (prefix, next_value)
  values (p_prefix, 1)
  on conflict (prefix) do nothing;

  update enterprise_asset_id_counters
    set next_value = next_value + 1
    where prefix = p_prefix
    returning next_value - 1 into v_value;

  return 'MO-' || p_prefix || '-' || lpad(v_value::text, 6, '0');
end;
$$;

-- ============================================================
-- 3. Core asset table
-- ============================================================

create table if not exists enterprise_assets (
  id uuid primary key default gen_random_uuid(),
  global_id text not null unique,
  asset_type_code text not null references enterprise_asset_types(code),
  name text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  lifecycle_stage text not null default 'concept',
  owner text,
  country text,
  business_domain text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  created_by text not null default 'system',
  updated_by text not null default 'system',
  search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) stored,
  constraint enterprise_assets_metadata_is_object check (jsonb_typeof(metadata) = 'object'),
  constraint enterprise_assets_name_not_blank check (length(trim(name)) > 0),
  -- Defense-in-depth: the API layer (validation.ts) already enforces these
  -- bounds, but a caller invoking the RPC functions directly would bypass
  -- it. Limits mirror the app-layer constants (MAX_NAME_LENGTH,
  -- MAX_TEXT_FIELD_LENGTH, MAX_DESCRIPTION_LENGTH) so both layers agree.
  constraint enterprise_assets_name_length check (length(name) <= 200),
  constraint enterprise_assets_description_length check (description is null or length(description) <= 2000),
  constraint enterprise_assets_owner_length check (owner is null or length(owner) <= 500),
  constraint enterprise_assets_business_domain_length check (business_domain is null or length(business_domain) <= 500),
  constraint enterprise_assets_country_format check (country is null or country ~ '^[A-Z]{2}$'),
  constraint enterprise_assets_metadata_size check (pg_column_size(metadata) <= 65536)
);

create index if not exists idx_enterprise_assets_asset_type on enterprise_assets(asset_type_code);
create index if not exists idx_enterprise_assets_status on enterprise_assets(status);
create index if not exists idx_enterprise_assets_lifecycle_stage on enterprise_assets(lifecycle_stage);
create index if not exists idx_enterprise_assets_owner on enterprise_assets(owner);
create index if not exists idx_enterprise_assets_business_domain on enterprise_assets(business_domain);
create index if not exists idx_enterprise_assets_created_at on enterprise_assets(created_at desc);
create index if not exists idx_enterprise_assets_search_vector on enterprise_assets using gin(search_vector);

create or replace function set_enterprise_assets_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_enterprise_assets_updated_at on enterprise_assets;
create trigger trg_enterprise_assets_updated_at
before update on enterprise_assets
for each row execute function set_enterprise_assets_updated_at();

-- ============================================================
-- 4. Relationships
-- ============================================================

create table if not exists enterprise_asset_relationships (
  id uuid primary key default gen_random_uuid(),
  source_asset_id uuid not null references enterprise_assets(id) on delete cascade,
  target_asset_id uuid not null references enterprise_assets(id) on delete cascade,
  relationship_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by text not null default 'system',
  constraint enterprise_asset_relationships_no_self_reference check (source_asset_id <> target_asset_id),
  constraint enterprise_asset_relationships_unique unique (source_asset_id, target_asset_id, relationship_type),
  constraint enterprise_asset_relationships_type_not_blank check (length(trim(relationship_type)) > 0),
  constraint enterprise_asset_relationships_type_length check (length(relationship_type) <= 100),
  constraint enterprise_asset_relationships_metadata_size check (pg_column_size(metadata) <= 65536)
);

create index if not exists idx_ear_source on enterprise_asset_relationships(source_asset_id);
create index if not exists idx_ear_target on enterprise_asset_relationships(target_asset_id);

-- ============================================================
-- 5. Audit log (every mutation, no exceptions)
-- ============================================================

create table if not exists enterprise_asset_audit_log (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid references enterprise_assets(id) on delete set null,
  action text not null check (action in (
    'AssetCreated', 'AssetUpdated', 'AssetArchived', 'AssetRestored',
    'RelationshipCreated', 'LifecycleChanged'
  )),
  actor text not null default 'system',
  before jsonb,
  after jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists idx_eaal_asset_id on enterprise_asset_audit_log(asset_id);
create index if not exists idx_eaal_occurred_at on enterprise_asset_audit_log(occurred_at desc);

-- ============================================================
-- 6. Domain events (outbox — feeds the future Enterprise Graph)
-- ============================================================

create table if not exists enterprise_asset_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in (
    'AssetCreated', 'AssetUpdated', 'AssetArchived', 'RelationshipCreated', 'LifecycleChanged'
  )),
  asset_id uuid references enterprise_assets(id) on delete set null,
  payload jsonb not null,
  occurred_at timestamptz not null default now(),
  consumed_at timestamptz
);

create index if not exists idx_eae_event_type on enterprise_asset_events(event_type);
create index if not exists idx_eae_occurred_at on enterprise_asset_events(occurred_at desc);
create index if not exists idx_eae_unconsumed on enterprise_asset_events(consumed_at) where consumed_at is null;

-- ============================================================
-- 7. Mutation functions — mutation + audit + event, one transaction
-- ============================================================

create or replace function create_enterprise_asset(
  p_asset_type_code text,
  p_name text,
  p_description text,
  p_status text,
  p_lifecycle_stage text,
  p_owner text,
  p_country text,
  p_business_domain text,
  p_metadata jsonb,
  p_actor text
) returns enterprise_assets
language plpgsql
as $$
declare
  v_prefix text;
  v_global_id text;
  v_row enterprise_assets;
begin
  select prefix into v_prefix
    from enterprise_asset_types
    where code = p_asset_type_code and active = true;

  if v_prefix is null then
    raise exception 'Unknown or inactive asset_type_code: %', p_asset_type_code;
  end if;

  v_global_id := generate_enterprise_asset_global_id(v_prefix);

  insert into enterprise_assets (
    global_id, asset_type_code, name, description, status, lifecycle_stage,
    owner, country, business_domain, metadata, created_by, updated_by
  ) values (
    v_global_id, p_asset_type_code, p_name, p_description,
    coalesce(p_status, 'active'), coalesce(p_lifecycle_stage, 'concept'),
    p_owner, p_country, p_business_domain, coalesce(p_metadata, '{}'::jsonb),
    coalesce(p_actor, 'system'), coalesce(p_actor, 'system')
  )
  returning * into v_row;

  insert into enterprise_asset_audit_log (asset_id, action, actor, before, after)
  values (v_row.id, 'AssetCreated', coalesce(p_actor, 'system'), null, to_jsonb(v_row));

  insert into enterprise_asset_events (event_type, asset_id, payload)
  values ('AssetCreated', v_row.id, to_jsonb(v_row));

  return v_row;
end;
$$;

create or replace function update_enterprise_asset(
  p_global_id text,
  p_name text,
  p_description text,
  p_status text,
  p_lifecycle_stage text,
  p_owner text,
  p_country text,
  p_business_domain text,
  p_metadata jsonb,
  p_actor text
) returns enterprise_assets
language plpgsql
as $$
declare
  v_before enterprise_assets;
  v_after enterprise_assets;
begin
  select * into v_before from enterprise_assets where global_id = p_global_id for update;
  if v_before.id is null then
    raise exception 'Asset not found: %', p_global_id;
  end if;
  if v_before.status = 'archived' then
    raise exception 'Cannot update an archived asset; restore it first: %', p_global_id;
  end if;

  update enterprise_assets set
    name = p_name,
    description = p_description,
    status = p_status,
    lifecycle_stage = p_lifecycle_stage,
    owner = p_owner,
    country = p_country,
    business_domain = p_business_domain,
    metadata = p_metadata,
    updated_by = coalesce(p_actor, 'system')
  where global_id = p_global_id
  returning * into v_after;

  insert into enterprise_asset_audit_log (asset_id, action, actor, before, after)
  values (v_after.id, 'AssetUpdated', coalesce(p_actor, 'system'), to_jsonb(v_before), to_jsonb(v_after));

  insert into enterprise_asset_events (event_type, asset_id, payload)
  values ('AssetUpdated', v_after.id, jsonb_build_object('before', to_jsonb(v_before), 'after', to_jsonb(v_after)));

  if v_before.lifecycle_stage is distinct from v_after.lifecycle_stage then
    insert into enterprise_asset_audit_log (asset_id, action, actor, before, after)
    values (
      v_after.id, 'LifecycleChanged', coalesce(p_actor, 'system'),
      jsonb_build_object('lifecycle_stage', v_before.lifecycle_stage),
      jsonb_build_object('lifecycle_stage', v_after.lifecycle_stage)
    );

    insert into enterprise_asset_events (event_type, asset_id, payload)
    values (
      'LifecycleChanged', v_after.id,
      jsonb_build_object('global_id', v_after.global_id, 'from', v_before.lifecycle_stage, 'to', v_after.lifecycle_stage)
    );
  end if;

  return v_after;
end;
$$;

create or replace function archive_enterprise_asset(p_global_id text, p_actor text)
returns enterprise_assets
language plpgsql
as $$
declare
  v_before enterprise_assets;
  v_after enterprise_assets;
begin
  select * into v_before from enterprise_assets where global_id = p_global_id for update;
  if v_before.id is null then
    raise exception 'Asset not found: %', p_global_id;
  end if;
  if v_before.status = 'archived' then
    return v_before;
  end if;

  update enterprise_assets
    set status = 'archived', archived_at = now(), updated_by = coalesce(p_actor, 'system')
    where global_id = p_global_id
    returning * into v_after;

  insert into enterprise_asset_audit_log (asset_id, action, actor, before, after)
  values (v_after.id, 'AssetArchived', coalesce(p_actor, 'system'), to_jsonb(v_before), to_jsonb(v_after));

  insert into enterprise_asset_events (event_type, asset_id, payload)
  values ('AssetArchived', v_after.id, to_jsonb(v_after));

  return v_after;
end;
$$;

create or replace function restore_enterprise_asset(p_global_id text, p_actor text)
returns enterprise_assets
language plpgsql
as $$
declare
  v_before enterprise_assets;
  v_after enterprise_assets;
begin
  select * into v_before from enterprise_assets where global_id = p_global_id for update;
  if v_before.id is null then
    raise exception 'Asset not found: %', p_global_id;
  end if;
  if v_before.status <> 'archived' then
    return v_before;
  end if;

  update enterprise_assets
    set status = 'active', archived_at = null, updated_by = coalesce(p_actor, 'system')
    where global_id = p_global_id
    returning * into v_after;

  insert into enterprise_asset_audit_log (asset_id, action, actor, before, after)
  values (v_after.id, 'AssetRestored', coalesce(p_actor, 'system'), to_jsonb(v_before), to_jsonb(v_after));

  return v_after;
end;
$$;

create or replace function create_enterprise_asset_relationship(
  p_source_global_id text,
  p_target_global_id text,
  p_relationship_type text,
  p_metadata jsonb,
  p_actor text
) returns enterprise_asset_relationships
language plpgsql
as $$
declare
  v_source_id uuid;
  v_target_id uuid;
  v_row enterprise_asset_relationships;
  v_existed boolean;
begin
  select id into v_source_id from enterprise_assets where global_id = p_source_global_id;
  select id into v_target_id from enterprise_assets where global_id = p_target_global_id;

  if v_source_id is null then
    raise exception 'Source asset not found: %', p_source_global_id;
  end if;
  if v_target_id is null then
    raise exception 'Target asset not found: %', p_target_global_id;
  end if;
  if v_source_id = v_target_id then
    raise exception 'An asset cannot have a relationship with itself: %', p_source_global_id;
  end if;

  select exists(
    select 1 from enterprise_asset_relationships
    where source_asset_id = v_source_id and target_asset_id = v_target_id and relationship_type = p_relationship_type
  ) into v_existed;

  insert into enterprise_asset_relationships (source_asset_id, target_asset_id, relationship_type, metadata, created_by)
  values (v_source_id, v_target_id, p_relationship_type, coalesce(p_metadata, '{}'::jsonb), coalesce(p_actor, 'system'))
  on conflict (source_asset_id, target_asset_id, relationship_type) do update
    set metadata = excluded.metadata
  returning * into v_row;

  -- Only audit/publish on the first creation — a repeat call with the same
  -- (source, target, type) triple is an idempotent metadata upsert, not a
  -- new relationship, and shouldn't produce a second RelationshipCreated
  -- record.
  if not v_existed then
    insert into enterprise_asset_audit_log (asset_id, action, actor, before, after)
    values (v_source_id, 'RelationshipCreated', coalesce(p_actor, 'system'), null, to_jsonb(v_row));

    insert into enterprise_asset_events (event_type, asset_id, payload)
    values (
      'RelationshipCreated', v_source_id,
      to_jsonb(v_row) || jsonb_build_object('source_global_id', p_source_global_id, 'target_global_id', p_target_global_id)
    );
  end if;

  return v_row;
end;
$$;

-- ============================================================
-- 8. Row Level Security (read-all, matching migration 005's platform-wide
--    pattern — this repo has no auth layer yet; writes stay service-role only)
-- ============================================================

alter table enterprise_asset_types enable row level security;
create policy enterprise_asset_types_read_all on enterprise_asset_types for select using (true);

alter table enterprise_assets enable row level security;
create policy enterprise_assets_read_all on enterprise_assets for select using (true);

alter table enterprise_asset_relationships enable row level security;
create policy enterprise_asset_relationships_read_all on enterprise_asset_relationships for select using (true);

alter table enterprise_asset_audit_log enable row level security;
create policy enterprise_asset_audit_log_read_all on enterprise_asset_audit_log for select using (true);

alter table enterprise_asset_events enable row level security;
create policy enterprise_asset_events_read_all on enterprise_asset_events for select using (true);
