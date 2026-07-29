-- MasterOps Migration 009 — EA-003 Secure Foundation API (Phase 0)
-- Service-to-service authentication, authorization, request audit, and
-- credential management for EA-001/EA-002's HTTP API surface.
--
-- Design notes (see docs/enterprise-foundation/EA-003_SECURE_FOUNDATION_API_DESIGN.md
-- and EA-003_IMPLEMENTATION_READINESS.md for full rationale):
--   * Zero changes to EA-001 or EA-002's own tables/functions. This migration
--     only adds new tables.
--   * Machine identity = an EA-002 SERVICE identity per consuming application
--     (created via EA-002's existing, unmodified API). Credential material is
--     NEVER stored on enterprise_identities — ADR-002 decision 5 makes "no
--     credential storage, ever" a hard non-goal of that service. A real FK
--     from enterprise_api_credentials to enterprise_identities is used (not a
--     soft reference) since both tables live in the same database — the same
--     precedent EA-002's own asset_id FK to EA-001 already established for
--     same-database references, reserving soft references for genuinely
--     cross-database/service boundaries.
--   * Only a SHA-256 hash of each credential's secret is ever stored. The raw
--     secret is generated and returned exactly once, at issuance, and never
--     persisted anywhere. Verification is hash-then-exact-match-lookup, which
--     is "secure hash verification" per the approved design's requirement
--     (Authentication §3) — standard practice for high-entropy random API
--     keys (not low-entropy user passwords), used by e.g. GitHub/Stripe's own
--     token schemes, and not vulnerable to the timing side-channel that
--     motivates timing-safe *string* comparison, since no two secret strings
--     are ever compared byte-by-byte in application code.
--   * RLS: no policies for anon/authenticated on any table here — even
--     stricter posture than EA-002's, since this schema is exclusively
--     credential/audit material. Service role only (native BYPASSRLS, same
--     mechanism EA-001/EA-002 already rely on).

-- ============================================================
-- 1. Credentials — one row per issued secret, bound to exactly one
--    EA-002 SERVICE identity
-- ============================================================

create table if not exists enterprise_api_credentials (
  id uuid primary key default gen_random_uuid(),
  identity_id uuid not null references enterprise_identities(id),
  -- First 8 chars of the raw secret, stored in the clear, purely for human
  -- identification in listings/audit trails (e.g. "moak_a1b2...") — never
  -- sufficient on its own to authenticate, the full secret's hash is what's
  -- actually checked.
  credential_prefix text not null,
  secret_hash text not null unique,
  scopes text[] not null default '{}',
  status text not null default 'active' check (status in ('active', 'revoked', 'expired')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_by text not null default 'system',
  constraint enterprise_api_credentials_scopes_not_empty check (array_length(scopes, 1) > 0)
);

create index if not exists idx_eapi_cred_identity on enterprise_api_credentials(identity_id);
create index if not exists idx_eapi_cred_status on enterprise_api_credentials(status);
create index if not exists idx_eapi_cred_secret_hash on enterprise_api_credentials(secret_hash);

-- ============================================================
-- 2. Credential lifecycle audit — distinct from request audit (table 3).
--    Mirrors EA-001/EA-002's own audit_log shape (action/actor/before/after).
-- ============================================================

create table if not exists enterprise_api_credential_audit_log (
  id uuid primary key default gen_random_uuid(),
  credential_id uuid references enterprise_api_credentials(id) on delete set null,
  action text not null check (action in ('CredentialCreated', 'CredentialRotated', 'CredentialRevoked', 'CredentialExpired')),
  actor text not null default 'system',
  before jsonb,
  after jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists idx_eapi_cred_audit_credential on enterprise_api_credential_audit_log(credential_id);
create index if not exists idx_eapi_cred_audit_occurred_at on enterprise_api_credential_audit_log(occurred_at desc);

-- ============================================================
-- 3. Request audit — one row per authenticated request against a
--    protected Foundation API route. Deliberately does not log request/
--    response bodies or secret material — metadata only, matching this
--    platform's existing security_events/api_usage_logs level of detail.
-- ============================================================

create table if not exists enterprise_api_request_log (
  id uuid primary key default gen_random_uuid(),
  correlation_id uuid not null default gen_random_uuid(),
  credential_id uuid references enterprise_api_credentials(id) on delete set null,
  identity_id uuid references enterprise_identities(id) on delete set null,
  capability text check (capability in ('enterprise-assets', 'enterprise-identities')),
  operation text check (operation in ('read', 'write')),
  method text not null,
  path text not null,
  result text not null check (result in ('allowed', 'denied')),
  denial_reason text,
  status_code int not null,
  rate_limit_outcome text check (rate_limit_outcome in ('allowed', 'limited', 'unavailable', 'not_applicable')),
  latency_ms int,
  occurred_at timestamptz not null default now()
);

create index if not exists idx_eapi_reqlog_credential on enterprise_api_request_log(credential_id);
create index if not exists idx_eapi_reqlog_result on enterprise_api_request_log(result);
create index if not exists idx_eapi_reqlog_occurred_at on enterprise_api_request_log(occurred_at desc);
create index if not exists idx_eapi_reqlog_correlation on enterprise_api_request_log(correlation_id);

-- ============================================================
-- 4. Mutation functions — credential lifecycle actions write their own
--    audit record in the same transaction, same discipline as EA-001/EA-002.
-- ============================================================

create or replace function create_enterprise_api_credential(
  p_identity_id uuid,
  p_credential_prefix text,
  p_secret_hash text,
  p_scopes text[],
  p_expires_at timestamptz,
  p_actor text
) returns enterprise_api_credentials
language plpgsql
as $$
declare
  v_row enterprise_api_credentials;
begin
  if not exists (select 1 from enterprise_identities where id = p_identity_id) then
    raise exception 'Identity not found: %', p_identity_id;
  end if;

  insert into enterprise_api_credentials (
    identity_id, credential_prefix, secret_hash, scopes, expires_at, created_by
  ) values (
    p_identity_id, p_credential_prefix, p_secret_hash, coalesce(p_scopes, '{}'), p_expires_at, coalesce(p_actor, 'system')
  )
  returning * into v_row;

  insert into enterprise_api_credential_audit_log (credential_id, action, actor, before, after)
  values (v_row.id, 'CredentialCreated', coalesce(p_actor, 'system'), null, to_jsonb(v_row) - 'secret_hash');

  return v_row;
end;
$$;

create or replace function revoke_enterprise_api_credential(p_credential_id uuid, p_actor text)
returns enterprise_api_credentials
language plpgsql
as $$
declare
  v_before enterprise_api_credentials;
  v_after enterprise_api_credentials;
begin
  select * into v_before from enterprise_api_credentials where id = p_credential_id for update;
  if v_before.id is null then
    raise exception 'Credential not found: %', p_credential_id;
  end if;
  if v_before.status = 'revoked' then
    return v_before;
  end if;

  update enterprise_api_credentials
    set status = 'revoked', revoked_at = now()
    where id = p_credential_id
    returning * into v_after;

  insert into enterprise_api_credential_audit_log (credential_id, action, actor, before, after)
  values (v_after.id, 'CredentialRevoked', coalesce(p_actor, 'system'), to_jsonb(v_before) - 'secret_hash', to_jsonb(v_after) - 'secret_hash');

  return v_after;
end;
$$;

-- Touches last_used_at only — not audited (high-frequency, no audit value
-- in recording "was used" on every single request; the request log itself,
-- table 3, is the record of usage).
create or replace function touch_enterprise_api_credential_last_used(p_credential_id uuid)
returns void
language plpgsql
as $$
begin
  update enterprise_api_credentials set last_used_at = now() where id = p_credential_id;
end;
$$;

-- ============================================================
-- 5. Row Level Security — no policies for anon/authenticated on any table
--    here (stricter than EA-002's already-stricter-than-EA-001 posture).
--    Service role only, via native BYPASSRLS — same mechanism EA-001/EA-002
--    already rely on, no explicit policy needed for it.
-- ============================================================

alter table enterprise_api_credentials enable row level security;
alter table enterprise_api_credential_audit_log enable row level security;
alter table enterprise_api_request_log enable row level security;
