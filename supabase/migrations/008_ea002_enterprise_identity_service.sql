-- MasterOps Migration 008 — EA-002 Enterprise Identity Service (Phase 1 only)
-- Enterprise Foundation capability: the record of who/what can act within
-- MasterOps — explicitly not authentication, login, or permissions.
--
-- Design notes (see docs/enterprise-foundation/ADR-002-enterprise-identity-service.md
-- and EA-002_ENTERPRISE_IDENTITY_DESIGN_SPECIFICATION.md for full rationale):
--   * Identity TYPE is a lookup table, same mechanism as EA-001's asset types.
--     GROUP is deliberately not seeded (Open Question 1, deferred per Founder
--     Decision — do not implement).
--   * Identity lifecycle is its own vocabulary (provisioned/active/suspended/
--     deactivated/archived) — not a reuse of EA-001's lifecycle_stage.
--   * Exactly one integration point with EA-001: an optional, nullable,
--     outbound asset_id FK. This migration does NOT alter enterprise_assets
--     in any way — EA-001 has zero knowledge this table exists.
--   * Own independent ID counter (enterprise_identity_id_counters) — no
--     shared mutable state with EA-001's counter table.
--   * RLS DOES NOT inherit EA-001's read-all pattern (ADR-002 decision 6):
--     enterprise_identities holds real PII (names/emails) for PERSON/EXTERNAL
--     types. Per Founder Decision (2026-07-28), the minimum posture is:
--       - Service Role: Full Access
--       - Enterprise Admin: Controlled Access
--       - Authenticated Users: No direct table access
--       - Public: No access
--     Service Role, Authenticated, and Public are all achievable today:
--     Postgres/Supabase's service_role always bypasses RLS (no policy
--     needed), and simply enabling RLS with ZERO select/insert/update/delete
--     policies for anon/authenticated means both are default-denied.
--     "Enterprise Admin: Controlled Access" is NOT implemented in this
--     migration — there is no mechanism anywhere in this codebase to
--     identify an Enterprise Admin at the database layer (no auth provider
--     exists; ADMIN_EMAILS is a display-only label, never enforced — see
--     Design Spec §0). Building one would be a new Access Control capability,
--     explicitly out of scope for this assignment. Disclosed as an open gap
--     in EA-002_EVIDENCE_PACKAGE.md, not silently skipped or faked with a
--     policy that doesn't actually check anything.

-- ============================================================
-- 1. Identity type lookup (extensible without schema redesign)
-- ============================================================

create table if not exists enterprise_identity_types (
  code text primary key,
  prefix text not null unique,
  label text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into enterprise_identity_types (code, prefix, label, description) values
  ('PERSON',   'PERSON',   'Person',   'An individual human — Founder, team member, or contractor.'),
  ('SERVICE',  'SERVICE',  'Service',  'A non-human system actor — an automation, scheduled job, or API integration client.'),
  ('EXTERNAL', 'EXTERNAL', 'External', 'An actor outside MasterOps'' direct control that still needs to be referenceable — a vendor contact, a partner organization.')
  -- GROUP deliberately not seeded here (Design Spec Open Question 1;
  -- Founder Decision 2026-07-28: deferred, do not implement).
on conflict (code) do nothing;

-- ============================================================
-- 2. Immutable global ID generation (own counter, independent of EA-001's)
-- ============================================================

create table if not exists enterprise_identity_id_counters (
  prefix text primary key,
  next_value bigint not null default 1
);

create or replace function generate_enterprise_identity_global_id(p_prefix text)
returns text
language plpgsql
as $$
declare
  v_value bigint;
begin
  insert into enterprise_identity_id_counters (prefix, next_value)
  values (p_prefix, 1)
  on conflict (prefix) do nothing;

  update enterprise_identity_id_counters
    set next_value = next_value + 1
    where prefix = p_prefix
    returning next_value - 1 into v_value;

  -- Approved prefix root is 'ID-' (Founder Decision 2026-07-28), deliberately
  -- distinct from EA-001's 'MO-' so an Identity global ID is visually
  -- distinguishable from an Asset global ID at a glance.
  return 'ID-' || p_prefix || '-' || lpad(v_value::text, 6, '0');
end;
$$;

-- ============================================================
-- 3. Core identity table
-- ============================================================

create table if not exists enterprise_identities (
  id uuid primary key default gen_random_uuid(),
  global_id text not null unique,
  identity_type_code text not null references enterprise_identity_types(code),
  display_name text not null,
  description text,
  lifecycle_state text not null default 'provisioned'
    check (lifecycle_state in ('provisioned', 'active', 'suspended', 'deactivated', 'archived')),
  owner text,
  business_scope text,
  contact_email text,
  -- Exactly one integration point with EA-001 (ADR-002 decision 3): optional,
  -- nullable, outbound, read-only from this side. EA-001 has no reverse
  -- knowledge of this column and is not modified by this migration.
  asset_id uuid references enterprise_assets(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  created_by text not null default 'system',
  updated_by text not null default 'system',
  search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(display_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) stored,
  constraint enterprise_identities_metadata_is_object check (jsonb_typeof(metadata) = 'object'),
  constraint enterprise_identities_display_name_not_blank check (length(trim(display_name)) > 0),
  -- Defense-in-depth: the API layer (validation.ts) already enforces these
  -- bounds; these mirror the app-layer constants so both layers agree,
  -- matching EA-001's own defense-in-depth convention (migration 007).
  constraint enterprise_identities_display_name_length check (length(display_name) <= 200),
  constraint enterprise_identities_description_length check (description is null or length(description) <= 2000),
  constraint enterprise_identities_owner_length check (owner is null or length(owner) <= 500),
  constraint enterprise_identities_business_scope_length check (business_scope is null or length(business_scope) <= 100),
  constraint enterprise_identities_contact_email_length check (contact_email is null or length(contact_email) <= 320),
  constraint enterprise_identities_metadata_size check (pg_column_size(metadata) <= 65536)
);

create index if not exists idx_enterprise_identities_identity_type on enterprise_identities(identity_type_code);
create index if not exists idx_enterprise_identities_lifecycle_state on enterprise_identities(lifecycle_state);
create index if not exists idx_enterprise_identities_owner on enterprise_identities(owner);
create index if not exists idx_enterprise_identities_business_scope on enterprise_identities(business_scope);
create index if not exists idx_enterprise_identities_asset_id on enterprise_identities(asset_id);
create index if not exists idx_enterprise_identities_created_at on enterprise_identities(created_at desc);
create index if not exists idx_enterprise_identities_search_vector on enterprise_identities using gin(search_vector);

create or replace function set_enterprise_identities_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_enterprise_identities_updated_at on enterprise_identities;
create trigger trg_enterprise_identities_updated_at
before update on enterprise_identities
for each row execute function set_enterprise_identities_updated_at();

-- ============================================================
-- 4. Audit log (every mutation, no exceptions — mirrors EA-001's shape)
-- ============================================================

create table if not exists enterprise_identity_audit_log (
  id uuid primary key default gen_random_uuid(),
  identity_id uuid references enterprise_identities(id) on delete set null,
  action text not null check (action in (
    'IdentityCreated', 'IdentityUpdated', 'IdentityActivated', 'IdentitySuspended',
    'IdentityReactivated', 'IdentityDeactivated', 'IdentityArchived',
    'IdentityLinkedToAsset', 'IdentityUnlinkedFromAsset'
  )),
  actor text not null default 'system',
  before jsonb,
  after jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists idx_eial_identity_id on enterprise_identity_audit_log(identity_id);
create index if not exists idx_eial_occurred_at on enterprise_identity_audit_log(occurred_at desc);

-- ============================================================
-- 5. Domain events (outbox — same pattern as EA-001)
-- ============================================================

create table if not exists enterprise_identity_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in (
    'IdentityCreated', 'IdentityUpdated', 'IdentityActivated', 'IdentitySuspended',
    'IdentityReactivated', 'IdentityDeactivated', 'IdentityArchived',
    'IdentityLinkedToAsset', 'IdentityUnlinkedFromAsset'
  )),
  identity_id uuid references enterprise_identities(id) on delete set null,
  payload jsonb not null,
  occurred_at timestamptz not null default now(),
  consumed_at timestamptz
);

create index if not exists idx_eie_event_type on enterprise_identity_events(event_type);
create index if not exists idx_eie_occurred_at on enterprise_identity_events(occurred_at desc);
create index if not exists idx_eie_unconsumed on enterprise_identity_events(consumed_at) where consumed_at is null;

-- ============================================================
-- 6. Mutation functions — mutation + audit + event, one transaction each.
--    Lifecycle transitions follow the Design Spec §2 state diagram exactly:
--    no transition skips a state. Re-invoking a transition that would leave
--    the identity in the state it's already in is idempotent (returns the
--    current row, no duplicate audit/event) — same style as EA-001's
--    archive/restore. Invoking a transition from a state the diagram does
--    not allow raises an exception naming the invalid jump. This idempotency
--    convention is an implementation-phase decision (disclosed in the
--    Evidence Package), not spelled out verbatim in the Design Spec.
-- ============================================================

create or replace function create_enterprise_identity(
  p_identity_type_code text,
  p_display_name text,
  p_description text,
  p_owner text,
  p_business_scope text,
  p_contact_email text,
  p_metadata jsonb,
  p_actor text
) returns enterprise_identities
language plpgsql
as $$
declare
  v_prefix text;
  v_global_id text;
  v_row enterprise_identities;
begin
  select prefix into v_prefix
    from enterprise_identity_types
    where code = p_identity_type_code and active = true;

  if v_prefix is null then
    raise exception 'Unknown or inactive identity_type_code: %', p_identity_type_code;
  end if;

  v_global_id := generate_enterprise_identity_global_id(v_prefix);

  insert into enterprise_identities (
    global_id, identity_type_code, display_name, description,
    owner, business_scope, contact_email, metadata, created_by, updated_by
  ) values (
    v_global_id, p_identity_type_code, p_display_name, p_description,
    p_owner, p_business_scope, p_contact_email, coalesce(p_metadata, '{}'::jsonb),
    coalesce(p_actor, 'system'), coalesce(p_actor, 'system')
  )
  returning * into v_row;

  insert into enterprise_identity_audit_log (identity_id, action, actor, before, after)
  values (v_row.id, 'IdentityCreated', coalesce(p_actor, 'system'), null, to_jsonb(v_row));

  insert into enterprise_identity_events (event_type, identity_id, payload)
  values ('IdentityCreated', v_row.id, to_jsonb(v_row));

  return v_row;
end;
$$;

create or replace function update_enterprise_identity(
  p_global_id text,
  p_display_name text,
  p_description text,
  p_owner text,
  p_business_scope text,
  p_contact_email text,
  p_metadata jsonb,
  p_actor text
) returns enterprise_identities
language plpgsql
as $$
declare
  v_before enterprise_identities;
  v_after enterprise_identities;
begin
  select * into v_before from enterprise_identities where global_id = p_global_id for update;
  if v_before.id is null then
    raise exception 'Identity not found: %', p_global_id;
  end if;
  if v_before.lifecycle_state = 'archived' then
    raise exception 'Cannot update an archived identity (archived is terminal, no restore path): %', p_global_id;
  end if;

  update enterprise_identities set
    display_name = p_display_name,
    description = p_description,
    owner = p_owner,
    business_scope = p_business_scope,
    contact_email = p_contact_email,
    metadata = p_metadata,
    updated_by = coalesce(p_actor, 'system')
  where global_id = p_global_id
  returning * into v_after;

  insert into enterprise_identity_audit_log (identity_id, action, actor, before, after)
  values (v_after.id, 'IdentityUpdated', coalesce(p_actor, 'system'), to_jsonb(v_before), to_jsonb(v_after));

  insert into enterprise_identity_events (event_type, identity_id, payload)
  values ('IdentityUpdated', v_after.id, jsonb_build_object('before', to_jsonb(v_before), 'after', to_jsonb(v_after)));

  return v_after;
end;
$$;

create or replace function activate_enterprise_identity(p_global_id text, p_actor text)
returns enterprise_identities
language plpgsql
as $$
declare
  v_before enterprise_identities;
  v_after enterprise_identities;
begin
  select * into v_before from enterprise_identities where global_id = p_global_id for update;
  if v_before.id is null then
    raise exception 'Identity not found: %', p_global_id;
  end if;
  -- No idempotent same-target shortcut here: 'active' is also reactivate()'s
  -- target, so "already active" does not tell us this specific transition
  -- (activate, from Provisioned) is the one that produced it. Strict per the
  -- Design Spec §2 diagram, which only offers Provisioned -> Active for
  -- activate — unlike suspend/deactivate/archive below, whose target states
  -- are each reachable through exactly one transition, so idempotency there
  -- is unambiguous.
  if v_before.lifecycle_state <> 'provisioned' then
    raise exception 'Cannot activate identity from state "%": %', v_before.lifecycle_state, p_global_id;
  end if;

  update enterprise_identities
    set lifecycle_state = 'active', updated_by = coalesce(p_actor, 'system')
    where global_id = p_global_id
    returning * into v_after;

  insert into enterprise_identity_audit_log (identity_id, action, actor, before, after)
  values (v_after.id, 'IdentityActivated', coalesce(p_actor, 'system'), to_jsonb(v_before), to_jsonb(v_after));

  insert into enterprise_identity_events (event_type, identity_id, payload)
  values ('IdentityActivated', v_after.id, to_jsonb(v_after));

  return v_after;
end;
$$;

create or replace function suspend_enterprise_identity(p_global_id text, p_actor text)
returns enterprise_identities
language plpgsql
as $$
declare
  v_before enterprise_identities;
  v_after enterprise_identities;
begin
  select * into v_before from enterprise_identities where global_id = p_global_id for update;
  if v_before.id is null then
    raise exception 'Identity not found: %', p_global_id;
  end if;
  if v_before.lifecycle_state = 'suspended' then
    return v_before;
  end if;
  if v_before.lifecycle_state <> 'active' then
    raise exception 'Cannot suspend identity from state "%": %', v_before.lifecycle_state, p_global_id;
  end if;

  update enterprise_identities
    set lifecycle_state = 'suspended', updated_by = coalesce(p_actor, 'system')
    where global_id = p_global_id
    returning * into v_after;

  insert into enterprise_identity_audit_log (identity_id, action, actor, before, after)
  values (v_after.id, 'IdentitySuspended', coalesce(p_actor, 'system'), to_jsonb(v_before), to_jsonb(v_after));

  insert into enterprise_identity_events (event_type, identity_id, payload)
  values ('IdentitySuspended', v_after.id, to_jsonb(v_after));

  return v_after;
end;
$$;

create or replace function reactivate_enterprise_identity(p_global_id text, p_actor text)
returns enterprise_identities
language plpgsql
as $$
declare
  v_before enterprise_identities;
  v_after enterprise_identities;
begin
  select * into v_before from enterprise_identities where global_id = p_global_id for update;
  if v_before.id is null then
    raise exception 'Identity not found: %', p_global_id;
  end if;
  -- Strict for the same reason activate() is strict above: 'active' is a
  -- shared target between the two transitions, so no idempotent shortcut.
  if v_before.lifecycle_state <> 'suspended' then
    raise exception 'Cannot reactivate identity from state "%": %', v_before.lifecycle_state, p_global_id;
  end if;

  update enterprise_identities
    set lifecycle_state = 'active', updated_by = coalesce(p_actor, 'system')
    where global_id = p_global_id
    returning * into v_after;

  insert into enterprise_identity_audit_log (identity_id, action, actor, before, after)
  values (v_after.id, 'IdentityReactivated', coalesce(p_actor, 'system'), to_jsonb(v_before), to_jsonb(v_after));

  insert into enterprise_identity_events (event_type, identity_id, payload)
  values ('IdentityReactivated', v_after.id, to_jsonb(v_after));

  return v_after;
end;
$$;

create or replace function deactivate_enterprise_identity(p_global_id text, p_actor text)
returns enterprise_identities
language plpgsql
as $$
declare
  v_before enterprise_identities;
  v_after enterprise_identities;
begin
  select * into v_before from enterprise_identities where global_id = p_global_id for update;
  if v_before.id is null then
    raise exception 'Identity not found: %', p_global_id;
  end if;
  if v_before.lifecycle_state = 'deactivated' then
    return v_before;
  end if;
  if v_before.lifecycle_state not in ('active', 'suspended') then
    raise exception 'Cannot deactivate identity from state "%": %', v_before.lifecycle_state, p_global_id;
  end if;

  update enterprise_identities
    set lifecycle_state = 'deactivated', updated_by = coalesce(p_actor, 'system')
    where global_id = p_global_id
    returning * into v_after;

  insert into enterprise_identity_audit_log (identity_id, action, actor, before, after)
  values (v_after.id, 'IdentityDeactivated', coalesce(p_actor, 'system'), to_jsonb(v_before), to_jsonb(v_after));

  insert into enterprise_identity_events (event_type, identity_id, payload)
  values ('IdentityDeactivated', v_after.id, to_jsonb(v_after));

  return v_after;
end;
$$;

create or replace function archive_enterprise_identity(p_global_id text, p_actor text)
returns enterprise_identities
language plpgsql
as $$
declare
  v_before enterprise_identities;
  v_after enterprise_identities;
begin
  select * into v_before from enterprise_identities where global_id = p_global_id for update;
  if v_before.id is null then
    raise exception 'Identity not found: %', p_global_id;
  end if;
  if v_before.lifecycle_state = 'archived' then
    return v_before;
  end if;
  if v_before.lifecycle_state <> 'deactivated' then
    raise exception 'Cannot archive identity from state "%"; must be Deactivated first: %', v_before.lifecycle_state, p_global_id;
  end if;

  update enterprise_identities
    set lifecycle_state = 'archived', archived_at = now(), updated_by = coalesce(p_actor, 'system')
    where global_id = p_global_id
    returning * into v_after;

  insert into enterprise_identity_audit_log (identity_id, action, actor, before, after)
  values (v_after.id, 'IdentityArchived', coalesce(p_actor, 'system'), to_jsonb(v_before), to_jsonb(v_after));

  insert into enterprise_identity_events (event_type, identity_id, payload)
  values ('IdentityArchived', v_after.id, to_jsonb(v_after));

  return v_after;
end;
$$;

-- Identity-side of the EA-001 link. Takes the already-resolved EA-001 asset
-- uuid (resolved by the application layer via EA-001's own read-only
-- repository/API — see repository.ts linkIdentityAsset) rather than reading
-- enterprise_assets directly from this function, so the loose-coupling
-- boundary is enforced through EA-001's own public contract, not by this
-- migration reaching into EA-001's table.
create or replace function link_enterprise_identity_asset(
  p_global_id text,
  p_asset_id uuid,
  p_actor text
) returns enterprise_identities
language plpgsql
as $$
declare
  v_before enterprise_identities;
  v_after enterprise_identities;
begin
  select * into v_before from enterprise_identities where global_id = p_global_id for update;
  if v_before.id is null then
    raise exception 'Identity not found: %', p_global_id;
  end if;
  if v_before.lifecycle_state = 'archived' then
    raise exception 'Cannot modify an archived identity: %', p_global_id;
  end if;

  update enterprise_identities
    set asset_id = p_asset_id, updated_by = coalesce(p_actor, 'system')
    where global_id = p_global_id
    returning * into v_after;

  insert into enterprise_identity_audit_log (identity_id, action, actor, before, after)
  values (v_after.id, 'IdentityLinkedToAsset', coalesce(p_actor, 'system'), to_jsonb(v_before), to_jsonb(v_after));

  insert into enterprise_identity_events (event_type, identity_id, payload)
  values ('IdentityLinkedToAsset', v_after.id, to_jsonb(v_after));

  return v_after;
end;
$$;

create or replace function unlink_enterprise_identity_asset(p_global_id text, p_actor text)
returns enterprise_identities
language plpgsql
as $$
declare
  v_before enterprise_identities;
  v_after enterprise_identities;
begin
  select * into v_before from enterprise_identities where global_id = p_global_id for update;
  if v_before.id is null then
    raise exception 'Identity not found: %', p_global_id;
  end if;
  if v_before.lifecycle_state = 'archived' then
    raise exception 'Cannot modify an archived identity: %', p_global_id;
  end if;
  if v_before.asset_id is null then
    return v_before;
  end if;

  update enterprise_identities
    set asset_id = null, updated_by = coalesce(p_actor, 'system')
    where global_id = p_global_id
    returning * into v_after;

  insert into enterprise_identity_audit_log (identity_id, action, actor, before, after)
  values (v_after.id, 'IdentityUnlinkedFromAsset', coalesce(p_actor, 'system'), to_jsonb(v_before), to_jsonb(v_after));

  insert into enterprise_identity_events (event_type, identity_id, payload)
  values ('IdentityUnlinkedFromAsset', v_after.id, to_jsonb(v_after));

  return v_after;
end;
$$;

-- ============================================================
-- 7. Row Level Security — deliberately NOT EA-001's read-all pattern.
--    See the header note and EA-002_EVIDENCE_PACKAGE.md for the full
--    disclosure of what is and isn't enforced here.
-- ============================================================

alter table enterprise_identity_types enable row level security;
alter table enterprise_identities enable row level security;
alter table enterprise_identity_audit_log enable row level security;
alter table enterprise_identity_events enable row level security;
alter table enterprise_identity_id_counters enable row level security;

-- No policies are created for anon or authenticated roles on any of the
-- five tables above. With RLS enabled and zero permissive policies, Postgres
-- default-denies all access to both roles — this is what satisfies "Public:
-- No access" and "Authenticated Users: No direct table access" literally,
-- without writing a policy that would need to (incorrectly) claim to
-- distinguish one from the other.
--
-- "Service Role: Full Access" requires no policy either: Supabase's
-- service_role Postgres role is configured with BYPASSRLS, so every
-- application API route (which uses createServiceClient(), same as EA-001)
-- continues to work exactly as before, unaffected by RLS being enabled here.
--
-- "Enterprise Admin: Controlled Access" has NO corresponding policy in this
-- migration. There is currently no way to identify an Enterprise Admin at
-- the database layer in this codebase. Adding one (e.g. a custom claim, a
-- role table) would be a new Access Control capability — explicitly out of
-- scope for this assignment (Design Spec §6, "Access Control" is a named
-- future consumer, not something this service builds). This is a disclosed
-- open item, not a silently dropped requirement.
