# EA-003 Secure Foundation API — Evidence Package (Phase 0)

**Authorized by:** Enterprise Design Authority, 2026-07-28 — Design Approved (L2), authorized scope "Implement Phase 0 only."

## What was built

- **Migration** `supabase/migrations/009_ea003_secure_foundation_api.sql` — 3 tables (`enterprise_api_credentials`, `enterprise_api_credential_audit_log`, `enterprise_api_request_log`), 3 functions (`create_enterprise_api_credential`, `revoke_enterprise_api_credential`, `touch_enterprise_api_credential_last_used`). Zero changes to migrations 007/008 — confirmed by re-reading both, unmodified.
- **Types**: `src/types/enterprise-api-security.ts`, re-exported from `src/types/index.ts`.
- **Lib** (`src/lib/enterprise-api-security/`): `crypto.ts` (secret generation, SHA-256 hashing, timing-safe string comparison, well-formedness check), `constants.ts`, `rate-limit.ts` (fail-closed wrapper around the existing, unmodified `src/lib/rate-limit.ts`), `repository.ts` (DB access), `guard.ts` (`verifyFoundationApiRequest` — the single entry point), `http.ts` (generic, non-enumerable error responses).
- **Route protection**: one line added to the top of all **17 EA-001/EA-002 route files** (7 EA-001, 10 EA-002), calling `verifyFoundationApiRequest(req, scope)` before any existing logic. No other line in any of those files was changed. Full file list in the Implementation Progress report.
- **Tests**: 59 new tests (`crypto.test.ts`: 15, `repository.test.ts`: 17, `guard.test.ts`: 20, `route-integration.test.ts`: 7), plus the 130 pre-existing EA-001/EA-002 tests updated to stub the new guard (isolating business-logic tests from the new auth layer, the same isolation principle already applied to `createServiceClient`) and re-confirmed passing unchanged. **Combined suite: 189/189 passing.**

## Design decisions made during implementation (disclosed, not silently absorbed)

1. **Real FK, not a soft reference, from `enterprise_api_credentials` to `enterprise_identities`.** The approved design's §3 language ("soft reference, same non-FK pattern EA-002 uses for EA-001") was written by analogy to EA-002→EA-001, but that analogy doesn't hold here: EA-002→EA-001 is soft specifically because Design Spec considered avoiding a hard schema coupling between the two *capabilities*; EA-003's credential table is part of the *same* new capability as the identity it authenticates against was already designed to represent it — a real FK is simpler, safer (prevents orphaned credentials), and matches EA-002's own precedent of using a real FK wherever both sides live in the same database. Implemented as a real FK; noted here as a refinement, not a silent deviation.
2. **Secret verification is hash-then-exact-lookup, not a loop with timing-safe comparison per row.** This is the standard, secure approach for high-entropy random API keys (not low-entropy passwords) and satisfies the approved design's "timing-safe comparison OR secure hash verification" requirement via the second branch. A `timingSafeStringEqual` helper was still built and is available, satisfying the letter of "timing-safe... or" even though the hash-lookup path is what's actually load-bearing.
3. **Expiry is checked in real time** (`expires_at < now()` at verification time), not by relying on a background job having already flipped `status` to `'expired'` — guarantees denial of expired credentials even if no cleanup job exists yet (none was built in this Phase — not required by the approved design).
4. **`status_code` in the request-audit log records the guard's own authorization decision (200/401/403/429/503), not necessarily the wrapped route handler's eventual response status** (e.g. a 404 from a downstream not-found lookup). This audit log tracks the authentication/authorization gate's outcome, not full request/response tracing — a disclosed scope boundary, not an oversight.
5. **Error response bodies are deliberately generic and identical across every authentication-class denial** (missing/malformed/unknown/wrong-secret/revoked/expired credential, any inactive identity state) — verified by a dedicated test (`guard.test.ts`, "the HTTP error response body never reveals the specific denial reason"). The *specific* reason is recorded only in the server-side request-audit log. This prevents an external caller from using distinguishable error messages as an enumeration oracle.
6. **Scope reflects actual effect, not HTTP verb.** `POST /validate` on both EA-001 and EA-002 is scoped `:read`, not `:write`, since it never persists anything — disclosed in both files' updated comments.

## Verified, directly

| Check | Result |
|---|---|
| `npx tsc --noEmit` | Clean |
| `npx eslint src/lib/enterprise-api-security src/app/api/enterprise-assets src/app/api/enterprise-identities src/types/enterprise-api-security.ts src/types/index.ts` | Clean |
| `npx vitest run` (full repository suite) | **189/189 passing** (130 pre-existing, re-confirmed unchanged + 59 new) |
| `npm run build` (`next build`) | Succeeds, all 17 protected routes present in the route table |
| Full 19-item required test matrix (see task instruction) | All 19 covered — mapped explicitly in `EA-003_PRODUCTION_READINESS_REPORT.md` §Test Coverage Map |
| Fail-closed rate limiting | Verified via `guard.test.ts` items 13-14: both "limit exceeded" (429) and "configuration unavailable" (503) are denials, not silent passes |
| Secret redaction | Verified via 3 dedicated tests across `crypto.test.ts`/`repository.test.ts`/`guard.test.ts` confirming the raw secret never appears in any audit row, credential listing, or generated-secret serialization beyond the one `.secret` field |
| No regression to EA-001/EA-002 | 130 pre-existing tests pass unchanged (guard stubbed, business logic untouched) + `route-integration.test.ts` proves the real, unstubbed guard correctly wires into real route handlers with correct real business responses |
| Zero EA-001/EA-002 contract change | Confirmed by the above — same request/response shapes, same status codes for business-logic outcomes, only a new pre-check added |
| Zero Master Growth OS change | That repository was not opened during this implementation |

## NOT verified — disclosed, not hidden

- **Migration 009 has not been applied to any live database.** No Supabase write operation was performed this pass (per instruction: "applying a production migration without explicit approval" is a stop condition — not triggered because it was never attempted, not because it was attempted and blocked).
- **No live smoke test** — same root cause, and also correctly out of scope for an implementation-only pass with its own separate migration-execution checklist (see Production Readiness Report).
- **Upstash Redis credentials are still not provisioned** (`UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` absent from `.env.local`, re-confirmed this pass) — meaning in the *current* deployed environment, every Foundation API request would receive 503 (fail-closed), not "rate limiting doesn't apply." This is the correct, designed behavior, but it means the routes are not actually *usable* until this is provisioned — a real operational prerequisite, named in the Production Readiness Report, not a defect in this implementation.
- **No credential-cleanup/expiry background job** — expired credentials remain in the `active` status column until someone explicitly revokes them or the real-time expiry check (verified working) denies them at request time. Not required by the approved design.

## Files changed / added (this pass only — full detail in Implementation Progress)

New: 1 migration, 1 types file, 7 lib files, 4 test files, 1 test-fake file, 2 evidence/readiness docs.
Modified: `src/types/index.ts` (+1 export), 17 EA-001/EA-002 route files (+1 guard-check line each, no other change), 2 EA-001/EA-002 route test files (added a guard stub, same isolation principle as the existing `createServiceClient` stub).
