# EA-002 Enterprise Identity Service — Production Verification Package

**Status:** Prepared 2026-07-28, per Enterprise Design Authority instruction following EA-002 Phase 1's L3 (Build Complete) acceptance. **Preparation only — nothing in this package has been executed.** No production migration was run, no implementation file was modified to produce this package (confirmed via `git status`: zero changes under `src/`, `supabase/migrations/`, `vitest.config.ts` since the Evidence Package was written).

**Relationship to existing documents:** this package sequences and completes the checklist work `EA-002_PRODUCTION_READINESS_REPORT.md` started (its §B/§C are the source for Sections 1–2 below, expanded rather than duplicated) and adds two checklists that report didn't fully separate out: rollback *verification* (distinct from the rollback *procedure* it already lists) and a production evidence checklist (what to capture as proof, not just what to check).

---

## 1. Migration 008 Execution Checklist

Precondition: migration 007 (EA-001) must already be live — migration 008 declares a foreign key into `enterprise_assets`.

- [ ] Confirm migration 007 is applied (query: `select to_regclass('public.enterprise_assets');` returns non-null).
- [ ] Open the Supabase SQL Editor for project `ijalvgwopvrnhlizhdqw` (this project has no CLI-tracked migration history for 001–007 despite six being live — SQL Editor is the established method, not `supabase db push`; see `EA-002_PRODUCTION_READINESS_REPORT.md` §B for the full explanation).
- [ ] Paste the full, unmodified contents of `supabase/migrations/008_ea002_enterprise_identity_service.sql`.
- [ ] Execute. Expected object counts: 5 tables (`enterprise_identity_types`, `enterprise_identities`, `enterprise_identity_audit_log`, `enterprise_identity_events`, `enterprise_identity_id_counters`), 1 trigger (`trg_enterprise_identities_updated_at`), 9 functions, RLS enabled on all 5 tables, 3 identity-type seed rows.
- [ ] Confirm zero errors and zero warnings in the Editor output.
- [ ] Record the execution timestamp and operator identity (for the Production Evidence Checklist, Section 4).

## 2. Live Smoke-Test Checklist

Run against the real database/API after Section 1. Full SQL text in `EA-002_PRODUCTION_READINESS_REPORT.md` §C — referenced here as a checklist, not re-derived:

- [ ] Identity types seeded correctly: exactly `EXTERNAL`, `PERSON`, `SERVICE` (not `GROUP`).
- [ ] Create one real `PERSON` identity via the live API; global ID matches `ID-PERSON-000001` format (or the next available counter value if not the first record).
- [ ] RLS actually denies: a `select` against `enterprise_identities` using the **anon key** returns a permission error, not a row. (This is the inverse of EA-001's check — confirms EA-002 deliberately did *not* inherit EA-001's read-all pattern.)
- [ ] Full lifecycle walk through the live API in order: activate → suspend → reactivate → deactivate → archive. Each call returns 200 with the expected `lifecycle_state`.
- [ ] Confirm the invalid-transition guard live: attempt to archive a freshly-activated (never deactivated) identity; expect **409**, not 200 and not 500.
- [ ] Confirm exactly one `IdentityCreated` audit row exists for the test identity, `before = null`.
- [ ] Create one real EA-001 asset (or reuse an existing one), then link the test identity to it via `POST .../link-asset`; confirm `asset_id` is set and EA-001's own asset row is unchanged (read it back via EA-001's own API — no field should differ from before the link).
- [ ] Unlink via `DELETE .../link-asset`; confirm `asset_id` returns to null.
- [ ] Decide and record: delete the test identity/audit/event/asset-link rows created during this smoke test, or leave them as harmless seed data — either is acceptable, but the choice must be recorded (Section 4).

## 3. Rollback Verification Checklist

Verifies the rollback procedure itself (`EA-002_PRODUCTION_READINESS_REPORT.md` §E) is safe and complete — this is a review of the plan, not a re-statement of it.

- [ ] **Drop order is dependency-safe.** Confirmed by inspection: the trigger is dropped before the function it calls; all 9 functions are dropped before any table (functions reference tables, not the reverse); tables are dropped in an order where no `FOREIGN KEY` from an already-dropped table is still referenced by a not-yet-dropped one (`enterprise_identities` last among the tables, after the 4 tables that reference it).
- [ ] **Zero EA-001 objects appear in the rollback script.** Confirmed by re-reading the script line-by-line — no `enterprise_assets`, `enterprise_asset_*` table or function is named anywhere in it.
- [ ] **Rollback does not require deleting anything from `enterprise_assets`.** The FK is outbound-only and `on delete set null` on EA-002's side — even if an identity is linked to an asset at rollback time, dropping `enterprise_identities` cannot cascade into EA-001's table (there is no FK in the other direction for it to cascade through).
- [ ] **Data-loss acknowledgement.** Running the rollback script deletes every row created during the Section 2 smoke test (and any real usage since). This is expected and acceptable *only* if Phase 1 is being fully abandoned — if the goal is instead "undo migration 008 but keep the identity data," this rollback script is not the right tool and a targeted backup/export must happen first. Record which scenario applies before running it.
- [ ] **Application-layer rollback confirmed independent of the DB rollback.** Deleting `src/app/api/enterprise-identities/`, `src/lib/enterprise-identities/`, `src/types/enterprise-identities.ts`, and reverting the one added line in `src/types/index.ts` can happen in either order relative to the DB rollback without breaking EA-001 — verified by the same "zero shared state beyond the outbound FK" property already confirmed in the Evidence Package.
- [ ] Rollback procedure has been read, not just linked, by whoever will execute Section 1.

## 4. Production Evidence Checklist

What to actually capture and file as proof this deployment happened and was verified — distinct from Section 2's pass/fail checks.

- [ ] Migration execution timestamp and operator identity (Section 1's last item).
- [ ] Raw SQL Editor output/log from the migration run (screenshot or copy-paste), showing the object-creation confirmations and zero errors.
- [ ] Query results (not just pass/fail) for each Section 2 smoke-test query — the actual returned rows, not a summary.
- [ ] The disposition decision for smoke-test data (deleted vs. left in place — Section 2's last item) and, if deleted, confirmation of the deletion query used.
- [ ] Confirmation that `EA-002_PRODUCTION_VERIFICATION_CHECKLIST` sign-off (this package, once executed) and `CERTIFICATION_REGISTER.md`'s EA-002 row have both been updated to L4/L5 as appropriate — L4 once Sections 1–3 are clean, L5 once this evidence is actually filed against a live environment (per the Certification Ladder's own L4 vs. L5 distinction, `masterops-enterprise-vault:enterprise/08-delivery/CERTIFICATION_REGISTER.md` §1).
- [ ] File this evidence as an addendum to `EA-002_EVIDENCE_PACKAGE.md` (a new "Live Verification" section, dated) rather than a separate, hard-to-find document — matching how EA-001's own evidence package is structured as one cumulative record.

## Sign-off

- [ ] Sections 1–4 above all complete
- [ ] Enterprise Admin RLS exception (`EXCEPTION_REGISTER.md` EXC-001) re-confirmed still Accepted and unchanged at time of production deployment
- [ ] Founder/Design Authority sign-off: **\_\_\_\_\_\_\_\_\_\_\_\_\_\_**, date: **\_\_\_\_\_\_\_\_\_\_\_\_**
