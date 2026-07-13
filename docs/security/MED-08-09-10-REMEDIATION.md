# MED-08 / MED-09 / MED-10 — Remediation (zivosmedia)

Findings from the Run 6 ecosystem security audit (`ZIVO_ECOSYSTEM_SECURITY_FINDINGS.md` +
`ZIVO_ECOSYSTEM_VERIFICATION_ADDENDUM.md`), audited @ `cb39920`. Project `slirphzzwcogdbkeicff`
is the shared **PRODUCTION** identity authority (~266 real users). **No production data was
queried or mutated.** Fixes are authored on branch `claude/med-08-09-10-remediation`, **not
merged, not deployed, not applied to any database.**

## Fixes authored

| ID | Sev | Root cause | Fix (in this branch) |
|---|---|---|---|
| **MED-08** | CRITICAL | `20260503161835` restored table-level `GRANT SELECT ON profiles` to anon/authenticated, reverting the column-level hardening of `20260428014827` → any signed-in user could read `phone/email/date_of_birth` of all public profiles. | `supabase/migrations/20260712120000_…sql`: re-`REVOKE` table-level SELECT, re-`GRANT SELECT (<safe non-PII cols>)`. PII stays owner-only via `get_my_profile()` / `admin_get_profile()`. |
| **MED-10** | HIGH | Same migration restored table-level `GRANT UPDATE`; no column guard on `profiles` → owners could self-set `is_verified/kyc_status/phone_verified/payout_hold`. | Same migration: `BEFORE INSERT/UPDATE` trigger `enforce_profiles_trust_columns()` rejects non-`service_role` changes to trust columns (and forces safe defaults on insert). |
| **MED-09** | HIGH | `auto-recharge-ads-wallet/index.ts` `isInternalCaller()` returned true when the Authorization header merely contained the public `SUPABASE_ANON_KEY` (which ships in the web bundle) → anyone could force off-session card charges; no idempotency. | Removed the anon-key branch (only `x-cron-secret`/service-role authorize); added a per-store idempotency key to `paymentIntents.create`. |

Requirements enforced by the fix (task 5): **minimum-column responses** (column-level SELECT),
**ownership** (PII via owner RPC), **authenticated/owner-only** trust writes (service_role),
**no arbitrary enumeration of PII**. (RLS row-visibility, storage ownership, and signed-URL
expiration for the *other* profile/storage surfaces are tracked by CHT-13/MED-13 and require
the DB/storage to verify — see below.)

## Verification status — BLOCKED on a non-production backend

Applying these fixes, reproducing MED-08 with QA users, and running
`supabase/tests/med08_med10_regression.sql` all require a **non-production database** with
write access. **None exists** and I must not use production (task rule + Run 7 manifest marks
`slirphzz…` `PRODUCTION-do-not-write`). This session also has **no DB access at all** (no
`psql`/`supabase` CLI, unauthenticated MCP, no service-role key), and **no deploy tooling**
(no `vercel`/`wrangler`, no linked project) for the Preview.

### Exact user action needed to finish (task 3 requested this)

1. **Create a non-prod Media DB** — either:
   - `supabase branches create med-remediation` on project `slirphzzwcogdbkeicff` (Supabase
     branching gives an isolated Postgres with the schema, **no production rows**), **or**
   - restore a scrubbed clone into a new project.
   Then **authorize the Supabase MCP** (or provide a service-role key for that *non-prod* branch
   only) so the migration can be applied and the regression tests run.
2. **Seed 2 fictional QA users** (A, B) on that branch (Run 7 QA identities — never real users).
3. **Provide deploy access** — link a Vercel/Cloudflare Pages project + credentials for a stable
   fictional-data Preview (Quick Tunnel is not acceptable for final evidence).

With (1)–(3) I will: apply the migration on the branch, reproduce MED-08 (confirm the leak
pre-fix), run the regression suite (MED-08/09/10 + A/B isolation, private profile/content,
block/mute/report, storage), deploy the Preview, and report the applied `ANON RPCS AFTER`
count and green results.

## Apply order (for whoever has access — do NOT skip)
1. Apply `20260712120000_…sql` to the **non-prod** branch first.
2. Run `supabase/tests/med08_med10_regression.sql` (as QA users A and B) → all PASS.
3. Deploy `auto-recharge-ads-wallet` to the non-prod project; confirm anon-key POST ⇒ 401/403.
4. Only after green QA: promote to production in a maintenance window with the rollback ready
   (rollback = the prior table-level grants, but that re-opens MED-08 — prefer forward-fix).
