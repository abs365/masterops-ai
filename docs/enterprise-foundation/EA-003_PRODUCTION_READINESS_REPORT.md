# EA-003 Secure Foundation API — Production Readiness Report (Phase 0)

## Scope

First Production Readiness pass, produced immediately after Phase 0's build. Everything below is either a local-only check (done, ✅) or a live-database/live-environment step still pending (⏳) — no migration has been applied, no live smoke test performed, per instruction ("do not apply a production migration without explicit approval").

## A. Pre-flight (local, verified this session)

- [x] `npx tsc --noEmit` — clean
- [x] `npx eslint src/lib/enterprise-api-security src/app/api/enterprise-assets src/app/api/enterprise-identities src/types/enterprise-api-security.ts src/types/index.ts` — clean
- [x] `npx vitest run` — 189/189 (130 pre-existing unchanged + 59 new)
- [x] `npm run build` — succeeds, all 17 protected routes present
- [x] Migration SQL manually reviewed for idempotency — `create table if not exists`, `create or replace function`, matching the established migration-007/008 convention
- [x] Confirmed zero modification to migrations 007/008 or their tables/functions
- [x] Confirmed zero modification to `master-growth-os` (repository not opened)

## B. Test Coverage Map (required 19-item matrix → actual tests)

| # | Required scenario | Test |
|---|---|---|
| 1 | Valid active identity + valid credential | `guard.test.ts` → "1. allows a valid credential..." |
| 2 | Missing credential | `guard.test.ts` → "2. denies a missing credential..." |
| 3 | Malformed credential | `guard.test.ts` → "3. denies a malformed credential..." |
| 4 | Unknown credential | `guard.test.ts` → "4. denies an unknown credential..." |
| 5 | Wrong secret | `guard.test.ts` → "5. denies a wrong secret..." |
| 6 | Revoked credential | `guard.test.ts` → "6. denies a revoked credential" |
| 7 | Expired credential | `guard.test.ts` → "7. denies an expired credential" |
| 8 | Suspended identity | `guard.test.ts` → "8. denies when the linked identity is Suspended" |
| 9 | Deactivated identity | `guard.test.ts` → "9. denies when the linked identity is Deactivated" |
| 10 | Archived identity | `guard.test.ts` → "10. denies when the linked identity is Archived" |
| 11 | Unauthorised capability | `guard.test.ts` → "11. denies a capability the credential is not scoped for" |
| 12 | Unauthorised operation | `guard.test.ts` → "12. denies an operation the credential is not scoped for" |
| 13 | Rate-limit exceeded | `guard.test.ts` → "13. denies with 429..." |
| 14 | Missing rate-limit configuration | `guard.test.ts` → "14. denies with 503 (fails closed...)" |
| 15 | Request-audit success | `guard.test.ts` → "15. writes an 'allowed' audit row..." |
| 16 | Request-audit denial | `guard.test.ts` → "16. writes a 'denied' audit row..." |
| 17 | Secret redaction | 3 tests across `crypto.test.ts`, `repository.test.ts` ("never writes the raw secret into the audit log"), `guard.test.ts` ("17. never writes the raw secret into the request-audit log") |
| 18 | Credential rotation | `repository.test.ts` → "rotation issues a new credential..."; `guard.test.ts` → "18. accepts requests using a newly rotated credential" |
| 19a | Old credential rejection after revocation | `guard.test.ts` → "19. rejects the old credential once it has been rotated away from" |
| 19b | No regression to EA-001/EA-002 | All 130 pre-existing tests pass unchanged (guard stubbed) + `route-integration.test.ts` (7 tests, real unstubbed guard against real route handlers) |

## C. Migration Execution Checklist (⏳ — needs an operator with real DB access, and explicit production execution approval per the implementation gates)

1. [ ] Confirm migrations 007 and 008 are already live (EA-003's credential table FKs into `enterprise_identities`).
2. [ ] Open the Supabase SQL Editor for project `ijalvgwopvrnhlizhdqw`.
3. [ ] Paste and run `supabase/migrations/009_ea003_secure_foundation_api.sql`.
4. [ ] Confirm: 3 tables created, 3 functions created, RLS enabled on all 3 tables, zero policies (matches EA-002's stricter-than-EA-001 posture, intentionally).

## D. Live Smoke-Test Checklist (⏳)

1. [ ] Create the first machine identity via EA-002's existing API: `POST /api/enterprise-identities {"identity_type_code":"SERVICE","display_name":"Master Growth OS — Foundation API Consumer"}` (this call itself is now protected — see the bootstrap note in the Security Configuration Checklist, §F, item 3).
2. [ ] Activate it: `POST /api/enterprise-identities/{globalId}/activate`.
3. [ ] Issue its first credential (via a direct, authenticated Management-API/SQL call — no admin-issuance endpoint was built in this Phase, per the approved design's named bootstrap limitation).
4. [ ] Confirm a request to a protected route **without** a credential returns 401.
5. [ ] Confirm a request **with** the new credential and correct scope succeeds with the real, expected business response.
6. [ ] Confirm a request with correct credential but **wrong scope** returns 403.
7. [ ] Confirm `enterprise_api_request_log` has rows for both the allowed and denied requests above, with no secret material present.
8. [ ] Revoke the credential; confirm the same request now returns 401.
9. [ ] Confirm rate limiting genuinely fails closed if `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` are absent in the deployed environment (expect 503, not silent pass) — **this will be the observed behavior today**, since those variables are still not provisioned (Dependency Checklist item 1, unresolved since the design pass).

## E. Rollback Procedure

Migration 009 is purely additive — 3 new tables, 3 new functions, zero modification to any existing object (confirmed in §A). Rollback:

```sql
drop function if exists touch_enterprise_api_credential_last_used(uuid);
drop function if exists revoke_enterprise_api_credential(uuid, text);
drop function if exists create_enterprise_api_credential(uuid, text, text, text[], timestamptz, text);
drop table if exists enterprise_api_request_log;
drop table if exists enterprise_api_credential_audit_log;
drop table if exists enterprise_api_credentials;
```

**Consequence of rollback, named directly:** every EA-001/EA-002 route file already has the guard check wired in (§ "Route protection" in the Evidence Package) — rolling back only the *database* objects without also reverting the *application code* would make every protected route fail (the guard would error trying to query tables that no longer exist, not simply stop enforcing). A full rollback requires **both** the SQL above **and** reverting the 17 route-file changes plus removing `src/lib/enterprise-api-security/` — application-layer rollback is a code revert (git), not a runtime toggle, since Phase 0 was scoped as "implement," not "implement behind a feature flag."

## F. Security Configuration Checklist

1. [ ] `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` provisioned in the deployed environment — **not yet done**, confirmed absent from `.env.local` this pass. Until provisioned, every protected route returns 503 for every caller, correctly (fail-closed), but also unusably.
2. [ ] Confirm the deployed environment's Supabase project ref matches `ijalvgwopvrnhlizhdqw`.
3. [ ] **Bootstrap credential issuance**: the very first credential (for whichever application consumes Foundation APIs first, e.g. `master-growth-os`) must be created by an operator with real Supabase Management API / service-role access, following the same "no automated first-key issuance" limitation already disclosed in the approved design — no code change can close this, it is inherent to any credential system's first key.
4. [ ] Confirm no `.env.local` values were committed to git during this implementation (verified: `git status` shows `.env.local` is not tracked and was not touched).

## G. Redacted Operational Evidence Template (for whoever executes the Live Smoke-Test Checklist)

```
Migration 009 applied: <timestamp>, operator: <name>
First machine identity global_id: <ID-SERVICE-NNNNNN>
First credential_prefix (NEVER the full secret): <moak_XXXXXXXX>
Smoke test result: <pass/fail per §D item>
Rate-limit behavior observed: <503 fail-closed / 429 limited / 200 allowed>
Revocation test result: <pass/fail>
```

**This template is deliberately structured so filling it in correctly can never require writing a raw secret into it** — only the prefix, which is safe to record per the approved design's own credential-material definition.

## H. Sign-off

- [ ] Sections B–D all complete
- [ ] Security Configuration Checklist (§F) fully resolved, especially item 1 (Upstash)
- [ ] Enterprise Design Authority / Founder production execution approval recorded here: **\_\_\_\_\_\_\_\_\_\_\_\_\_\_**, date: **\_\_\_\_\_\_\_\_\_\_\_\_**
